'use client'

// Official-style crypto brand icons (SVG). Falls back to a neutral coin mark.
export function CryptoIcon({
  id,
  className,
}: {
  id: string
  className?: string
}) {
  switch (id) {
    case 'PLISIO':
      return (
        <img
          src="https://plisio.net/favicon.ico"
          alt="Plisio"
          className={className}
          referrerPolicy="no-referrer"
        />
      )
    case 'ATLOS':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-label="Atlos">
          <circle fill="#0F172A" cx="16" cy="16" r="16" />
          <path fill="#38BDF8" d="M16 6l8 14h-5.2l-2.8-5.3-2.8 5.3H8L16 6z" />
          <circle fill="#38BDF8" cx="16" cy="23.5" r="2" />
        </svg>
      )
    case 'HELEKET':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-label="Heleket">
          <circle fill="#6C47FF" cx="16" cy="16" r="16" />
          <path fill="#FFF" d="M10 8h3.6v6.2h4.8V8H22v16h-3.6v-6.4h-4.8V24H10z" />
        </svg>
      )
    case 'BTC':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-label="BTC">
          <circle fill="#F7931A" cx="16" cy="16" r="16" />
          <path
            fill="#FFF"
            d="M23.9 14.4c.3-2.1-1.3-3.2-3.5-3.9l.7-2.9-1.8-.4-.7 2.8c-.5-.1-.9-.2-1.4-.4l.7-2.8-1.8-.4-.7 2.9c-.4-.1-.8-.2-1.2-.3l-2.4-.6-.4 1.9s1.3.3 1.3.3c.7.2.8.7.8 1.1l-1.9 7.7c-.1.2-.3.5-.8.4l-1.3-.3-.9 2.1 2.3.6c.4.1.8.2 1.3.3l-.7 2.9 1.8.4.7-2.9c.5.1 1 .2 1.4.4l-.7 2.9 1.8.4.7-2.9c3 .6 5.3.3 6.2-2.4.8-2.2 0-3.5-1.6-4.3 1.1-.3 2-1 2.2-2.5zM21.6 20.7c-.5 2-3.8 1.8-6.2 1.6l1.1-4.5c2.4.2 5.6.6 5.1 2.9zm.6-7.2c-.5 1.9-3.2 1.7-5.1 1.4l1-4c2 .3 4.6.5 4.1 2.6z"
          />
        </svg>
      )
    case 'ETH':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-label="ETH">
          <circle fill="#627EEA" cx="16" cy="16" r="16" />
          <path fill="#FFF" d="M16.5 4v8.9l7.5 3.3L16.5 4z" />
          <path fill="#FFF" opacity=".6" d="M16.5 4L9 16.2l7.5-3.3z" />
          <path fill="#FFF" d="M16.5 22v6L24 17.6l-7.5 4.4z" />
          <path fill="#FFF" opacity=".6" d="M16.5 28v-6L9 17.6l7.5 4.4z" />
          <path fill="#FFF" opacity=".8" d="M16.5 20.6L24 16.2l-7.5-3.3-7.5 3.3z" />
          <path fill="#FFF" opacity=".6" d="M9 16.2l7.5 3.3v-6.7z" />
        </svg>
      )
    case 'BNB':
    case 'BINANCE_PAY':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-label="BNB">
          <circle fill="#F3BA2F" cx="16" cy="16" r="16" />
          <path
            fill="#FFF"
            d="M12.1 14.4L16 10.5l3.9 3.9 2.3-2.3L16 6l-6.1 6.1 2.2 2.3zm-6 1.6L8.4 13.8l2.2 2.2-2.2 2.2-2.3-2.2zm6 6L16 25.5l3.9-3.9 2.3 2.3L16 30l-6.1-6.1 2.1-1.9zm5.1-6l2.3-2.3L21.6 16l-2.2 2.2L17.2 16zm-1.2 1.8L16 17.8l-2.2-2.2L16 13.4l2.2 2.2-2.2 2.2z"
          />
        </svg>
      )
    case 'USDC':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-label="USDC">
          <circle fill="#2775CA" cx="16" cy="16" r="16" />
          <path
            fill="#FFF"
            d="M20.7 17.8c0-1.6-.9-2.2-2.7-2.5l-1.4-.3c-.8-.2-1.2-.6-1.2-1.2 0-.7.6-1.1 1.6-1.1.9 0 1.5.3 1.8.8.1.1.2.2.3.2l1.5-.9c-.1-.1-.1-.2-.2-.3-.3-.4-.8-.7-1.3-.8v-1.1h-1.8v1c-.8.2-1.4.7-1.4 1.5 0 1.5.9 2.1 2.6 2.4l1.4.3c.8.2 1.2.6 1.2 1.3 0 .8-.7 1.2-1.7 1.2-1 0-1.7-.3-2-1-.1-.1-.1-.2-.3-.3l-1.5.9c.2.4.5.8.9 1 .4.3 1 .5 1.5.6v1.1h1.8v-1.1c.9-.2 1.5-.8 1.5-1.6zM16 24.6c-4.7 0-8.6-3.9-8.6-8.6S11.3 7.4 16 7.4s8.6 3.9 8.6 8.6-3.9 8.6-8.6 8.6zm0-19.4C9.4 5.2 4 10.6 4 17.2S9.4 29.2 16 29.2s12-5.4 12-12S22.6 5.2 16 5.2z"
          />
        </svg>
      )
    case 'WISE':
      return (
        <svg viewBox="0 0 24 24" className={className} preserveAspectRatio="xMidYMid meet" aria-label="Wise">
          <path
            fill="#163300"
            d="M6.488 7.469 0 15.05h11.585l1.301-3.576H7.922l3.033-3.507.01-.092L8.993 4.48h8.873l-6.878 18.925h4.706L24 .595H2.543l3.945 6.874Z"
          />
        </svg>
      )
    case 'PAYONEER':
      return (
        <svg viewBox="0 0 64 64" className={className} preserveAspectRatio="xMidYMid meet" aria-label="Payoneer">
          <path fill="#ff4800" d="M64 52.8C64 59 59 64 52.8 64H11.2C5 64 0 59 0 52.8V11.2C0 5 5 0 11.2 0h41.6C59 0 64 5 64 11.2z" />
          <path
            fill="#fff"
            d="M13.903 16.8c.16 3.67 3.334 17.68 3.334 17.68 1.17 2.837 2.164 0 2.164 0 3.846-11.508-4.007-18.176-4.007-18.176-1.99-1.17-1.492.497-1.492.497m45.52-2.003s3.846 2.676 0 3.173c0 0-14.345 1.667-25.02 11.67 0 0-15.997 14.01-22.007 29.348 0 0-2.003 0-1.33-2.998S15.73 39.816 33.57 23.644c0 0 17.182-15.675 25.853-8.847"
          />
        </svg>
      )
    case 'SKRILL':
      return (
        <svg viewBox="0 0 64 64" className={className} preserveAspectRatio="xMidYMid meet" aria-label="Skrill">
          <path
            fill="#862565"
            d="M32.34 23.556c-2.086-.136-6.914-.448-6.914-4.796 0-5.245 6.95-5.245 9.56-5.245 4.584 0 10.522 1.353 14.762 2.623 0 0 2.366.834 4.38 1.688l.187.05V3.5l-.257-.076C49.05 1.684 43.232 0 32.444 0c-18.6 0-25.19 10.835-25.19 20.118 0 5.35 2.293 17.946 23.596 19.4 1.805.1 6.597.387 6.597 4.878 0 3.7-3.923 5.896-10.522 5.896-7.23 0-14.25-1.843-18.51-3.592v14.795C14.796 63.164 21.985 64 30.414 64 48.6 64 56.747 53.748 56.747 43.587c0-11.52-9.115-19.007-24.407-20.032"
          />
        </svg>
      )
    case 'NETELLER':
      return (
        <svg viewBox="0 0 64 64" className={className} preserveAspectRatio="xMidYMid meet" aria-label="Neteller">
          <path
            fill="#8dc640"
            d="M53.404 58.708 64 5.292l-17.18.019-6.084 32.717L28.615 5.31H10.012L0 58.701h17.765l6.059-33.616 11.763 33.616z"
          />
        </svg>
      )
    case 'REDOTPAY':
      return (
        <svg viewBox="0 0 24 24" className={className} preserveAspectRatio="xMidYMid meet" aria-label="RedotPay">
          <rect width="24" height="24" rx="6" fill="#16181C" />
          <circle cx="12" cy="12" r="6.2" fill="#FF2D1A" />
        </svg>
      )
    case 'BYBIT':
      return (
        <svg viewBox="0 0 13547 4513" className={className} preserveAspectRatio="xMidYMid meet" aria-label="Bybit">
          <polygon fill="#F6A500" points="9655,3480 9655,-1 10355,-1 10355,3480" />
          <path
            fill="#15182A"
            d="M1500 4514l-1500 0 0 -3481 1440 0c700,0 1107,381 1107,978 0,386 -262,636 -443,719 216,98 493,318 493,782 0,650 -458,1002 -1097,1002zm-116 -2875l0 0 -685 0 0 802 685 0c297,0 463,-161 463,-401 0,-239 -166,-401 -463,-401zm45 1413l0 0 -730 0 0 856 730 0c317,0 468,-195 468,-430 0,-235 -151,-425 -468,-425z"
          />
          <polygon
            fill="#15182A"
            points="4732,3086 4732,4514 4037,4514 4037,3086 2960,1033 3720,1033 4389,2436 5049,1033 5809,1033"
          />
          <path
            fill="#15182A"
            d="M7793 4514l-1500 0 0 -3481 1440 0c700,0 1107,381 1107,978 0,386 -262,636 -443,719 216,98 493,318 493,782 0,650 -458,1002 -1097,1002zm-116 -2875l0 0 -685 0 0 802 685 0c297,0 463,-161 463,-401 0,-239 -166,-401 -463,-401zm45 1413l0 0 -730 0 0 856 730 0c317,0 468,-195 468,-430 0,-235 -151,-425 -468,-425z"
          />
          <polygon
            fill="#15182A"
            points="12610,1639 12610,4514 11911,4514 11911,1639 10974,1639 10974,1033 13547,1033 13547,1639"
          />
        </svg>
      )
    case 'REVOLUT':
      return (
        <svg viewBox="0 0 24 24" className={className} preserveAspectRatio="xMidYMid meet" aria-label="Revolut">
          <path
            fill="#191C1F"
            d="M20.9133 6.9566C20.9133 3.1208 17.7898 0 13.9503 0H2.424v3.8605h10.9782c1.7376 0 3.177 1.3651 3.2087 3.043.016.84-.2994 1.633-.8878 2.2324-.5886.5998-1.375.9303-2.2144.9303H9.2322a.2756.2756 0 0 0-.2755.2752v3.431c0 .0585.018.1142.052.1612L16.2646 24h5.3114l-7.2727-10.094c3.6625-.1838 6.61-3.2612 6.61-6.9494zM6.8943 5.9229H2.424V24h4.4704z"
          />
        </svg>
      )
    case 'LTC':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-label="LTC">
          <circle fill="#345D9D" cx="16" cy="16" r="16" />
          <path fill="#FFF" d="M12.2 22.8h11.1l-.8 3H7.1l1.7-6.3-2.2.8.7-2.6 2.2-.8 2.6-9.7h4.9l-2.4 8.9 2.2-.8-.7 2.6-2.2.8-1.7 6.1z" />
        </svg>
      )
    case 'SOL':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-label="SOL">
          <circle fill="#15161C" cx="16" cy="16" r="16" />
          <path
            fill="#00FFA3"
            d="M10.4 21.2h9.7l-1.9 2H7.4z"
          />
          <path
            fill="#9945FF"
            d="M12.3 10h9.7l-1.9 2h-9.7z"
          />
          <path
            fill="#DC1FFF"
            d="M11.3 12.9l2.3-2.4h9.7l-2.3 2.4z"
          />
        </svg>
      )
    case 'USDT_TRC20':
    case 'USDT_BEP20':
    default:
      return (
        <svg viewBox="0 0 32 32" className={className} aria-label="USDT">
          <circle fill="#26A17B" cx="16" cy="16" r="16" />
          <path
            fill="#FFF"
            d="M17.9 17.4v-.002c-.111.008-.668.026-1.922.026-1 0-1.704-.019-1.921-.026v.003c-3.787-.173-6.607-.824-6.607-1.611s2.82-1.437 6.607-1.611v2.567c.219.013.927.027 1.928.027 1.172 0 1.787-.018 1.915-.027v-2.565c3.787.174 6.606.824 6.606 1.609 0 .787-2.82 1.438-6.606 1.611zm0-3.507v-2.291h5.252V8.343H8.826v3.242h5.252v2.29c-4.282.199-7.499 1.045-7.499 2.073s3.217 1.874 7.499 2.073v7.421h3.844v-7.42c4.282-.2 7.499-1.046 7.499-2.074s-3.217-1.873-7.499-2.072z"
          />
        </svg>
      )
  }
}

