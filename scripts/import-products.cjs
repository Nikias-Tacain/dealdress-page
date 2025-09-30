/* scripts/import-products.cjs */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

// ------------- Cargar .env.local -------------
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error(
    "Faltan variables FIREBASE_* en .env.local (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)"
  );
  process.exit(1);
}

// Importante: reemplazar \n escapados
const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

// ------------- Inicializar Admin SDK -------------
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ------------- Utiles -------------
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function makeSlug(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

// ------------- Entrada (ruta JSON) -------------
const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Uso: node scripts/import-products.cjs ./data/products.json");
  process.exit(1);
}

const abs = path.resolve(process.cwd(), inputFile);
if (!fs.existsSync(abs)) {
  console.error("No existe el archivo:", abs);
  process.exit(1);
}

(async () => {
  try {
    const raw = fs.readFileSync(abs, "utf8");
    /** @type {Array<any>} */
    const items = JSON.parse(raw);

    if (!Array.isArray(items) || items.length === 0) {
      console.error("El JSON no contiene un array con productos.");
      process.exit(1);
    }

    console.log(`Importando ${items.length} productos desde ${inputFile}…`);

    // En lotes de 450 (por debajo del límite de 500)
    const groups = chunk(items, 450);
    let total = 0;

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      const batch = db.batch();

      for (const it of group) {
        // Si viene id => upsert por id. Si no, creamos doc nuevo
        // Extra: si viene "slug", podés upsertear por slug único.
        const data = {
          title: it.title || "Producto",
          price: Number(it.price || 0),
          image: it.image || null,
          images: Array.isArray(it.images) ? it.images : [],
          description: it.description || "",
          category: it.category || null, // ej: "calzado", "deportivo", etc.
          gender: it.gender || null,     // ej: "hombre" | "mujer" | "unisex"
          shoeType: it.shoeType || null, // ej: "deportivo" | "botitas_everlast"
          active: typeof it.active === "boolean" ? it.active : true,
          sizes: it.sizes || {},

          // campos de sistema
          createdAt: it.createdAt ? it.createdAt : FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (it.id) {
          // Upsert por id explícito
          const ref = db.collection("products").doc(String(it.id));
          batch.set(ref, data, { merge: true });
        } else if (it.slug) {
          // Upsert por slug (si querés que sea único)
          const ref = db.collection("products").doc(String(it.slug));
          batch.set(ref, data, { merge: true });
        } else {
          // Agregar nuevo doc
          const ref = db.collection("products").doc();
          batch.set(ref, data, { merge: true });
        }
      }

      await batch.commit();
      total += group.length;
      console.log(`Lote ${gi + 1}/${groups.length} OK (${group.length} productos).`);
    }

    console.log(`✅ Importación finalizada. Total: ${total} productos.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error importando:", err?.message || err);
    process.exit(1);
  }
})();
