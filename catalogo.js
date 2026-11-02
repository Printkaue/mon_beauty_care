// catalogo.js

const grid = document.getElementById("productGrid");

async function carregarCatalogo() {
  grid.innerHTML = "<p>Carregando produtos...</p>";

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("id, titulo, descricao, categoria, imagem_url")
    .eq("ativo", true)
    .order("criado_em", { ascending: false });

  if (error) {
    grid.textContent = "Não foi possível carregar os produtos.";
    console.error(error);
    return;
  }

  grid.innerHTML = "";

  if (!data.length) {
    grid.innerHTML = "<p>Em breve teremos novidades por aqui.</p>";
    return;
  }

  data.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const art = document.createElement("div");
    art.className = "product-art";

    const img = document.createElement("img");
    img.src = product.imagem_url;
    img.alt = product.titulo;
    img.loading = "lazy";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";

    const info = document.createElement("div");
    info.className = "product-info";

    const category = document.createElement("small");
    category.textContent = product.categoria || "Produto";

    const title = document.createElement("h3");
    title.textContent = product.titulo;

    const description = document.createElement("p");
    description.textContent = product.descricao || "";

    const bottom = document.createElement("div");
    bottom.className = "product-bottom";

    const availability = document.createElement("span");
    availability.className = "price";
    availability.textContent = "Consulte disponibilidade";

    const link = document.createElement("a");
    link.href = "https://www.instagram.com/mon_beauty__care/";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Consultar ↗";

    bottom.append(availability, link);
    info.append(category, title, description, bottom);
    art.appendChild(img);
    card.append(art, info);
    grid.appendChild(card);
  });
}

carregarCatalogo();
