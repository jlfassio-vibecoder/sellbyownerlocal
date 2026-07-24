import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../../lib/auth';
import {
  buildPromotedComparablePatch,
  buildVehicleFromComparable,
  promoteComparableBlockReason,
} from '../../../../lib/build-vehicle-from-comparable';
import { db } from '../../../../lib/firebase-admin';
import { generateVehicleSlug } from '../../../../utils/url-helpers';
import {
  PromoteComparableRequestSchema,
  PromoteComparableResponseSchema,
  VehicleResponseSchema,
  VehicleSchema,
} from '../../../../schemas';

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = PromoteComparableRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { parentVehicleId, comparableIndex } = parsed.data;
    const parentDoc = await db().collection('vehicles').doc(parentVehicleId).get();

    if (!parentDoc.exists) {
      return jsonError('Vehicle not found', 404);
    }

    const parentParsed = VehicleResponseSchema.safeParse({
      id: parentDoc.id,
      ...parentDoc.data(),
    });

    if (!parentParsed.success) {
      return jsonError('Vehicle not found', 404);
    }

    const parent = parentParsed.data;

    try {
      assertVehicleOwner(session.uid, parent.sellerId);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return forbiddenResponse();
      }
      throw error;
    }

    if (parent.inventorySource === 'dealer_comp') {
      return jsonError('Cannot promote a comparable from a dealer comp listing', 400);
    }

    const comparables = parent.marketValuation?.comparables ?? [];
    const comparable = comparables[comparableIndex];

    if (!comparable) {
      return jsonError('Comparable not found. Save the listing, then try again.', 400);
    }

    if (comparable.promotedVehicleId) {
      const existingDoc = await db()
        .collection('vehicles')
        .doc(comparable.promotedVehicleId)
        .get();

      if (existingDoc.exists) {
        const existingParsed = VehicleResponseSchema.safeParse({
          id: existingDoc.id,
          ...existingDoc.data(),
        });
        if (
          existingParsed.success &&
          existingParsed.data.inventorySource === 'dealer_comp' &&
          existingParsed.data.parentVehicleId === parentVehicleId
        ) {
          const promotedPatch = buildPromotedComparablePatch(comparable);
          if (promotedPatch) {
            await db()
              .collection('vehicles')
              .doc(existingParsed.data.id)
              .update(promotedPatch);
          }

          const refreshed = {
            ...existingParsed.data,
            ...(promotedPatch ?? {}),
          };
          const path = `/vehicles/${generateVehicleSlug({
            year: Number(refreshed.year),
            make: String(refreshed.make),
            model: String(refreshed.model),
            id: existingParsed.data.id,
          })}`;
          const response = PromoteComparableResponseSchema.parse({
            vehicleId: existingParsed.data.id,
            path,
          });
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const blockReason = promoteComparableBlockReason(comparable);
    if (blockReason) {
      return jsonError(blockReason, 400);
    }

    let vehicleData;
    try {
      vehicleData = buildVehicleFromComparable({ parent, comparable });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : 'Unable to build vehicle', 400);
    }

    const vehicleParsed = VehicleSchema.safeParse(vehicleData);
    if (!vehicleParsed.success) {
      console.error(
        'Promoted comparable failed validation',
        z.flattenError(vehicleParsed.error)
      );
      return jsonError('Promoted comparable failed validation', 502);
    }

    const docRef = await db().collection('vehicles').add(vehicleParsed.data);

    const nextComparables = comparables.map((comp, index) =>
      index === comparableIndex
        ? { ...comp, promotedVehicleId: docRef.id }
        : comp
    );

    await db()
      .collection('vehicles')
      .doc(parentVehicleId)
      .update({
        marketValuation: {
          ...(parent.marketValuation ?? { comparables: [] }),
          comparables: nextComparables,
        },
      });

    const path = `/vehicles/${generateVehicleSlug({
      ...vehicleParsed.data,
      id: docRef.id,
    })}`;

    const response = PromoteComparableResponseSchema.parse({
      vehicleId: docRef.id,
      path,
    });

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('POST /api/seller/vehicles/from-comparable failed', error);
    return jsonError('Failed to promote comparable', 500);
  }
};
