import fetch from "node-fetch";

import { ENV } from "../config/env.server.mjs";
/**
 * @returns {Promise<string>} A formatted string containing the quote and author.
 * @throws {Error} Throws an error if the quote cannot be fetched or if the response format is invalid.
 */
export async function getRandomQuote() {
  try {
    const response = await fetch(ENV.services.zenquotes.apiUrl);
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
