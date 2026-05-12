import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ระบบบริหารจัดการน้ำประปาหมู่บ้าน',
    short_name: 'WaterSystem',
    description: 'ระบบจัดการมาตรวัดน้ำ ค่าน้ำประปา และการชำระเงินสำหรับหมู่บ้าน',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
