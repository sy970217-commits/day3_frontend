// 諛깆뿏??Railway) 二쇱냼 ?ㅼ젙
// - ??而댄벂??localhost)?먯꽌 ?대㈃ 濡쒖뺄 ?쒕쾭(8000)瑜??ъ슜
// - 諛고룷(Vercel)?먯꽌???꾨옒 RAILWAY_URL ???ъ슜 (?앹뿉 / ?놁씠)
const RAILWAY_URL = "https://web-production-94c0357c.up.railway.app";

const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
window.API_BASE = isLocal ? "http://127.0.0.1:8000" : RAILWAY_URL;
