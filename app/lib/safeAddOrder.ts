// app/lib/safeAddOrder.ts
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/app/lib/firebase";

export type OrderData = Record<string, unknown>;

export async function safeAddOrder(data: OrderData): Promise<string> {
  try {
    const colRef = collection(db, "orders");
    const res = await addDoc(colRef, data);
    return res.id;
  } catch (err) {
    const e = err as { message?: string; code?: string };
    console.error("🔥 Firestore WRITE failed", {
      op: "addDoc",
      path: "orders",
      message: e?.message,
      code: e?.code,
    });
    throw err;
  }
}
