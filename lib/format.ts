/**
 * Narxni formatlash — server va client da bir xil natija beradi.
 * toLocaleString ishlatilmaydi (locale farqi hydration muammo keltirib chiqaradi).
 */
export function formatPrice(amount: number): string {
  // Minglik ajratgich sifatida space ishlatamiz
  const parts = Math.floor(amount).toString().split("");
  const result: string[] = [];
  parts.forEach((ch, i) => {
    if (i > 0 && (parts.length - i) % 3 === 0) result.push(" ");
    result.push(ch);
  });
  return result.join("") + " so'm";
}
