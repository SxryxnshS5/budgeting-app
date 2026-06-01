// Rule-based "food persona" derived entirely from the user's receipts.
// Returns a friendly identity used for the personalized hero card.

import { drinkSplit } from "./health";

const topKey = (counts) => {
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
};

/**
 * Derive a persona from receipts.
 * @returns {{ title, emoji, blurb, highlights: {label,value}[] }}
 */
export function derivePersona(receipts) {
  const n = receipts.length;
  const total = receipts.reduce((s, r) => s + (r.total_amount || 0), 0);
  const avg = n ? total / n : 0;

  const cuisineCounts = {};
  const mealCounts = {};
  let groceryCount = 0, diningCount = 0;

  for (const r of receipts) {
    const c = r.cuisine || "Other";
    cuisineCounts[c] = (cuisineCounts[c] || 0) + 1;
    if (r.meal_type) mealCounts[r.meal_type] = (mealCounts[r.meal_type] || 0) + 1;
    if (r.category === "groceries" || c === "Grocery") groceryCount++;
    if (r.category === "dining") diningCount++;
  }

  const topCuisine = topKey(cuisineCounts);
  const topMeal = topKey(mealCounts);
  const distinctCuisines = Object.keys(cuisineCounts).length;
  const { alcoholic, nonAlcoholic } = drinkSplit(receipts);
  const midnight = mealCounts.midnight || 0;

  const highlights = [
    topCuisine && { label: "Go-to cuisine", value: topCuisine },
    topMeal && { label: "Favourite meal", value: topMeal[0].toUpperCase() + topMeal.slice(1) },
    { label: "Avg / receipt", value: `$${avg.toFixed(2)}` },
  ].filter(Boolean);

  // Rules in priority order — first match wins.
  let persona;
  if (topCuisine === "Cafe" || nonAlcoholic >= Math.max(4, n)) {
    persona = {
      title: "The Coffee Connoisseur",
      emoji: "☕",
      blurb: "Café runs are your love language. Those little cups add up fast — imagine brewing a few at home.",
    };
  } else if (topCuisine === "Fast Food") {
    persona = {
      title: "The Fast-Food Fan",
      emoji: "🍔",
      blurb: "Quick, convenient, satisfying. You know the value menu by heart — a little batch cooking could free up real cash.",
    };
  } else if (alcoholic >= 3 && alcoholic >= nonAlcoholic) {
    persona = {
      title: "The Social Sipper",
      emoji: "🍷",
      blurb: "Good food, good company, good drinks. Nights out are a highlight — and one of your biggest line items.",
    };
  } else if (midnight >= 2 && midnight >= (mealCounts.breakfast || 0)) {
    persona = {
      title: "The Night Owl",
      emoji: "🌙",
      blurb: "Late-night cravings are your signature. Midnight meals are fun, but often the priciest per bite.",
    };
  } else if (groceryCount > diningCount && groceryCount >= n / 2) {
    persona = {
      title: "The Home Chef",
      emoji: "🍳",
      blurb: "You'd rather cook than order in. Smart and budget-friendly — your kitchen is doing the heavy lifting.",
    };
  } else if (diningCount >= n / 2 && avg >= 30) {
    persona = {
      title: "The Fine Diner",
      emoji: "🍽️",
      blurb: "You eat well and you know it. Restaurant experiences are worth it — just keep an eye on the running total.",
    };
  } else if (distinctCuisines >= 4) {
    persona = {
      title: "The Globe-Trotting Foodie",
      emoji: "🌍",
      blurb: "Your taste buds have a passport. From one cuisine to the next, variety is the spice of your spending.",
    };
  } else {
    persona = {
      title: "The Everyday Foodie",
      emoji: "🍴",
      blurb: "A balanced mix of meals out and groceries in. Keep scanning receipts to sharpen your food profile.",
    };
  }

  return { ...persona, highlights };
}
