export async function fetchMethod(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Twitterbot" },
    });

    if (!response.body) return "";
    return response.text();
  } catch (error) {
    console.log("could not fetch");
    return "";
  }
}
