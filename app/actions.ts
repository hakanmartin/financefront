'use server';

import { auth0 } from "@/lib/auth0";

export async function syncUserAction(email: string) {
    try {
        // Sunucu bileşenleri ve eylemlerinde (Server Actions) güvendeyiz.
        // Bu yüzden Auth0'dan Access Token'ı şifreli çerezlerden çekebiliriz!
        const { token } = await auth0.getAccessToken();
        console.log("TOKEN:", token);

        if (!token) {
            console.error("Token alınamadı, yetkilendirme yetersiz.");
            return { success: false, message: "Token bulunamadı" };
        }

        const response = await fetch('http://localhost:3030/api/sync-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Arka plana Auth0 jetonunu veriyoruz!
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Senkronizasyon (Server Action) hatası:", error);
        return { success: false, message: "Sunucu eylemi (Server Action) başarısız oldu." };
    }
}

export async function getJwtToken() {
    const { token } = await auth0.getAccessToken();  // ← Artık gerçek JWT!
    return token;
}
