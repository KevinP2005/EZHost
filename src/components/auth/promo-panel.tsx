import Image from 'next/image'

const PROMO_IMAGE_URL =
  'https://images.pexels.com/photos/28238364/pexels-photo-28238364.jpeg?_gl=1*7ar7o8*_ga*MTA0NzQ1MDkyNC4xNzgxMDQwNjE4*_ga_8JE65Q40S6*czE3ODEwNDA2MTgkbzEkZzEkdDE3ODEwNDA2MTkkajU5JGwwJGgw'

export function PromoPanel() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        src={PROMO_IMAGE_URL}
        alt="Tropical beach landscape"
        fill
        priority
        sizes="45vw"
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/25" />

      <div className="absolute right-8 top-8 z-10 max-w-sm text-right">
        <h2 className="mb-2 text-[22px] font-semibold leading-snug text-white">
          Hosting operations, beautifully under control.
        </h2>
        <p className="text-[13.5px] leading-relaxed text-white/80">
          Manage services, customers, billing signals, and support workflows from
          one focused SaaS workspace.
        </p>
      </div>
    </div>
  )
}
