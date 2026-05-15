import './globals.css'

export const metadata = {
  title: 'PixelBoost AI - Free Image Enhancer',
  description:
    'Transform blurry, low-quality images into stunning 4K clarity using AI. Free forever.',

  verification: {
    google: 'IdEWAdEqwD1bimol0MFEYifok06RwBtGH-xIqQeRnFQ',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
