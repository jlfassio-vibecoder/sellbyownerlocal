import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

export type StorefrontCatalogPdfItem = {
  id: string;
  title: string;
  brand: string;
  price: number;
  primaryImageUrl?: string;
  sizes?: string[];
};

export type StorefrontCatalogPDFProps = {
  storefrontName: string;
  tagline?: string;
  heroImageUrl?: string;
  items: StorefrontCatalogPdfItem[];
};

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function resolveImageSrc(url: string | undefined): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#0f172a',
  },
  hero: {
    width: '100%',
    height: 140,
    objectFit: 'cover',
    marginBottom: 16,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 14,
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 18,
  },
  image: {
    width: '100%',
    height: 120,
    objectFit: 'cover',
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#e2e8f0',
    marginBottom: 8,
  },
  brand: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  price: {
    fontSize: 10,
    color: '#0f172a',
  },
  sizes: {
    marginTop: 3,
    fontSize: 8,
    color: '#64748b',
  },
});

export default function StorefrontCatalogPDF({
  storefrontName,
  tagline,
  heroImageUrl,
  items,
}: StorefrontCatalogPDFProps) {
  const heroSrc = resolveImageSrc(heroImageUrl);
  const taglineText = tagline?.trim();

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        {heroSrc ? <Image src={heroSrc} style={styles.hero} /> : null}

        <View style={styles.header}>
          <Text style={styles.title}>{storefrontName}</Text>
          {taglineText ? <Text style={styles.tagline}>{taglineText}</Text> : null}
        </View>

        <View style={styles.grid}>
          {items.map((item) => {
            const imageSrc = resolveImageSrc(item.primaryImageUrl);
            const sizesText = item.sizes?.filter(Boolean).join(', ');

            return (
              <View key={item.id} style={styles.card} wrap={false}>
                {imageSrc ? (
                  <Image src={imageSrc} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder} />
                )}
                <Text style={styles.brand}>{item.brand}</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
                {sizesText ? <Text style={styles.sizes}>{sizesText}</Text> : null}
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
