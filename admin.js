// admin.js

const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const loginForm = document.getElementById("loginForm");
const productForm = document.getElementById("productForm");
const productsList = document.getElementById("productsList");
const message = document.getElementById("message");

let currentUser = null;
let currentImageUrl = null;

function showMessage(text, error = false) {
  message.textContent = text;
  message.style.color = error ? "#ff9b9b" : "#d8b477";
}

async function checkAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    loginSection.style.display = "block";
    appSection.style.display = "none";
    return;
  }

  const { data: admin, error } = await supabaseClient
    .from("admins")
    .select("id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !admin) {
    await supabaseClient.auth.signOut();
    loginSection.style.display = "block";
    appSection.style.display = "none";
    document.getElementById("loginMessage").textContent =
      "Esta conta não tem autorização de administrador.";
    return;
  }

  currentUser = session.user;
  loginSection.style.display = "none";
  appSection.style.display = "block";
  await loadProducts();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginMessage = document.getElementById("loginMessage");

  loginMessage.textContent = "Verificando acesso...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent = "Não foi possível entrar: " + error.message;
    return;
  }

  await checkAdmin();
});

async function loadProducts() {
  productsList.innerHTML = "<p class='muted'>Carregando...</p>";

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    productsList.textContent = "Erro ao carregar produtos: " + error.message;
    return;
  }

  if (!data.length) {
    productsList.innerHTML = "<p class='muted'>Nenhum produto cadastrado ainda.</p>";
    return;
  }

  productsList.innerHTML = "";

  data.forEach((product) => {
    const item = document.createElement("article");
    item.className = "product";

    const img = document.createElement("img");
    img.src = product.imagem_url;
    img.alt = product.titulo;

    const info = document.createElement("div");
    info.className = "product-info";

    const name = document.createElement("strong");
    name.textContent = product.titulo;

    const category = document.createElement("small");
    category.textContent = product.categoria || "Sem categoria";

    info.append(name, category);

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const editButton = document.createElement("button");
    editButton.className = "button secondary";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => editProduct(product));

    const deleteButton = document.createElement("button");
    deleteButton.className = "button danger";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => deleteProduct(product));

    actions.append(editButton, deleteButton);
    item.append(img, info, actions);
    productsList.appendChild(item);
  });
}

function editProduct(product) {
  document.getElementById("productId").value = product.id;
  document.getElementById("title").value = product.titulo;
  document.getElementById("description").value = product.descricao || "";
  document.getElementById("category").value = product.categoria || "Perfumaria";
  document.getElementById("image").value = "";

  currentImageUrl = product.imagem_url;

  document.getElementById("formTitle").textContent = "Editar produto";
  document.getElementById("saveButton").textContent = "Atualizar produto";
  document.getElementById("cancelEdit").classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  productForm.reset();
  document.getElementById("productId").value = "";
  document.getElementById("formTitle").textContent = "Adicionar produto";
  document.getElementById("saveButton").textContent = "Salvar produto";
  document.getElementById("cancelEdit").classList.add("hidden");
  currentImageUrl = null;
}

document.getElementById("cancelEdit").addEventListener("click", resetForm);

async function uploadImage(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const allowed = ["jpg", "jpeg", "png", "webp"];

  if (!allowed.includes(extension)) {
    throw new Error("Formato de imagem não permitido.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const filePath = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseClient.storage
    .from("produtos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  const { data } = supabaseClient.storage
    .from("produtos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const saveButton = document.getElementById("saveButton");
  saveButton.disabled = true;
  showMessage("Salvando produto...");

  try {
    const id = document.getElementById("productId").value;
    const file = document.getElementById("image").files[0];

    let imageUrl = currentImageUrl;

    if (file) {
      imageUrl = await uploadImage(file);
    }

    if (!imageUrl) {
      throw new Error("Selecione uma foto para o produto.");
    }

    const product = {
      titulo: document.getElementById("title").value.trim(),
      descricao: document.getElementById("description").value.trim(),
      categoria: document.getElementById("category").value,
      imagem_url: imageUrl,
      ativo: true
    };

    if (id) {
      const { error } = await supabaseClient
        .from("produtos")
        .update(product)
        .eq("id", id);

      if (error) throw error;
      showMessage("Produto atualizado!");
    } else {
      const { error } = await supabaseClient
        .from("produtos")
        .insert(product);

      if (error) throw error;
      showMessage("Produto cadastrado!");
    }

    resetForm();
    await loadProducts();

  } catch (error) {
    showMessage("Erro: " + error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

async function deleteProduct(product) {
  const confirmed = confirm(`Deseja excluir "${product.titulo}"?`);
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("produtos")
    .delete()
    .eq("id", product.id);

  if (error) {
    alert("Não foi possível excluir: " + error.message);
    return;
  }

  // A imagem antiga permanece no Storage por enquanto.
  // A exclusão do registro já remove o produto da vitrine.
  await loadProducts();
}

document.getElementById("logoutButton").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  appSection.style.display = "none";
  loginSection.style.display = "block";
});

supabaseClient.auth.onAuthStateChange(() => {
  // A verificação também é feita ao carregar a página.
});

checkAdmin();
