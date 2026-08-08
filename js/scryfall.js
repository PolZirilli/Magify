/* ==========================================================
   ScryfallService — equivalente web del ScryfallService.swift
   API pública: https://scryfall.com/docs/api
   ========================================================== */

const ScryfallService = (() => {

  const BASE_URL = "https://api.scryfall.com";

  /**
   * Busca cartas por nombre (fuzzy search vía /cards/search).
   * @param {string} query
   * @returns {Promise<Array<Object>>} lista de MagicCard-like objects
   */
  async function searchCards(query) {
    const url = `${BASE_URL}/cards/search?q=${encodeURIComponent(query)}&order=name`;
    const res = await fetch(url);

    if (res.status === 404) {
      // Scryfall devuelve 404 cuando no hay resultados
      return [];
    }
    if (!res.ok) {
      throw new Error(`Scryfall respondió ${res.status}`);
    }

    const data = await res.json();
    return (data.data || []).map(normalizeCard);
  }

  /**
   * Obtiene una carta aleatoria.
   * @returns {Promise<Object>} MagicCard-like object
   */
  async function fetchRandomCard() {
    const res = await fetch(`${BASE_URL}/cards/random`);
    if (!res.ok) {
      throw new Error(`Scryfall respondió ${res.status}`);
    }
    const data = await res.json();
    return normalizeCard(data);
  }

  /**
   * Normaliza la respuesta cruda de Scryfall al shape que usa la UI.
   * Contempla cartas de doble cara (card_faces) tomando la primera cara
   * cuando la carta principal no trae image_uris directamente.
   */
  function normalizeCard(raw) {
    const face = (!raw.image_uris && raw.card_faces && raw.card_faces[0]) || null;

    return {
      id: raw.id,
      name: raw.name,
      image_uris: raw.image_uris || (face ? face.image_uris : null),
      mana_cost: raw.mana_cost || (face ? face.mana_cost : "") || "",
      type_line: raw.type_line || (face ? face.type_line : "") || "",
      oracle_text: raw.oracle_text || (face ? face.oracle_text : "") || "",
      set_name: raw.set_name || "",
      set: raw.set || "",
      rarity: raw.rarity || "",
      prices: raw.prices || {},

      // ---- datos adicionales ----
      artist: raw.artist || (face ? face.artist : "") || "",
      collector_number: raw.collector_number || "",
      released_at: raw.released_at || "",
      power: raw.power || (face ? face.power : "") || "",
      toughness: raw.toughness || (face ? face.toughness : "") || "",
      loyalty: raw.loyalty || (face ? face.loyalty : "") || "",
      color_identity: raw.color_identity || [],
      legalities: raw.legalities || {},
      flavor_text: raw.flavor_text || (face ? face.flavor_text : "") || "",
      keywords: raw.keywords || [],

      // ---- enlaces ----
      scryfall_uri: raw.scryfall_uri || "",
      gatherer_uri: (raw.related_uris && raw.related_uris.gatherer) || "",
      edhrec_uri: (raw.related_uris && raw.related_uris.edhrec) || "",
    };
  }

  /**
   * Autocompletado de nombres de carta (endpoint dedicado y liviano de Scryfall).
   * @param {string} query
   * @returns {Promise<Array<string>>} hasta 20 nombres sugeridos
   */
  async function autocomplete(query) {
    const url = `${BASE_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  }

  /**
   * Busca otras cartas ilustradas por el mismo artista (para el carrusel
   * "Otras obras del mismo artista" en el detalle).
   * unique=art devuelve ilustraciones distintas en vez de reimpresiones repetidas.
   * @param {string} artist
   * @param {string} excludeId id de la carta actual, para no repetirla
   * @returns {Promise<Array<Object>>}
   */
  async function searchByArtist(artist, excludeId) {
    if (!artist) return [];
    const q = `artist:"${artist}"`;
    const url = `${BASE_URL}/cards/search?q=${encodeURIComponent(q)}&unique=art&order=released&dir=desc`;
    const res = await fetch(url);

    if (res.status === 404 || !res.ok) return [];

    const data = await res.json();
    return (data.data || [])
      .filter((c) => c.id !== excludeId)
      .map(normalizeCard);
  }

  return { searchCards, fetchRandomCard, autocomplete, searchByArtist };
})();
