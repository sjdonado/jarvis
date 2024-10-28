import fetch from "node-fetch";

export async function getRandomQuote() {
  try {
    const response = await fetch("https://zenquotes.io/api/random");
    const data = await response.json();
    if (!data[0]?.q && data[0]?.a) {
      throw new Error(`Failed to fetch quote - ${data}`);
    }

    const message = `"${data[0].q}" - ${data[0].a}`;

    return message;
  } catch (error) {
    console.error("Error fetching quote");
    throw new Error(error);
  }
}
