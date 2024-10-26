export async function zenquotesGetRandom() {
  try {
    const response = await fetch("https://zenquotes.io/api/random");
    const data = await response.json();
    if (!data[0]?.q && data[0]?.a) {
      throw new Error(`Failed to fetch quote - ${data}`);
    }

    const message = `"${data[0].q}"\n ― ${data[0].a}`;

    return message;
  } catch (error) {
    console.error("Error fetching quote:", error);
  }

  return null;
}
