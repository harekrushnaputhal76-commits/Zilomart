// ============================================================================
// ZILOMARKET PRODUCTION CONTROLLER — 100% REAL FIREBASE FIRESTORE & AUTH
// ============================================================================

import {
  registerUserWithRole,
  loginUser,
  watchUserSession,
  logoutUser,
  fetchLiveShops,
  addProductToShop,
  updateShopVerification,
  removeShopFromDB
} from "./firebase-db.js";

// Global Live State (100% from Firestore Cloud)
let liveShops = [];
let activeUser = null;

// ============================================================================
// REACTBITS LINE SIDEBAR ENGINE (Smooth Gliding Vertical Indicator)
// ============================================================================
function initLineSidebar(trackId, indicatorId, onSelectCallback) {
  const track = document.getElementById(trackId);
  const indicator = document.getElementById(indicatorId);
  if (!track || !indicator) return;

  const items = Array.from(track.querySelectorAll(".line-nav-item"));

  function moveIndicatorTo(el) {
    if (!el) return;
    indicator.style.transform = `translateY(${el.offsetTop}px)`;
    indicator.style.height = `${el.offsetHeight}px`;
  }

  // Initial positioning
  const currentActive = track.querySelector(".line-nav-item.active") || items[0];
  requestAnimationFrame(() => moveIndicatorTo(currentActive));

  items.forEach(item => {
    // Hover preview glide
    item.addEventListener("mouseenter", () => moveIndicatorTo(item));

    // Click selection
    item.addEventListener("click", (e) => {
      if (item.tagName === "BUTTON") {
        e.preventDefault();
        items.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        moveIndicatorTo(item);
        if (onSelectCallback) onSelectCallback(item);
      }
    });
  });

  // Snap back to active item when mouse leaves track
  track.addEventListener("mouseleave", () => {
    const active = track.querySelector(".line-nav-item.active") || items[0];
    moveIndicatorTo(active);
  });
}

// Initialize secondary portal line nav if present
initLineSidebar("portalLineNav", "portalLineIndicator");

// ============================================================================
// 1. LIVE STOREFRONT CONTROLLER (index.html)
// ============================================================================
const shopGrid = document.getElementById("shopGrid");

if (shopGrid) {
  let activeCategory = "all";
  let scrollStackMode = false;

  const searchInput = document.getElementById("searchInput");
  const radiusFilter = document.getElementById("radiusFilter");
  const sortSelect = document.getElementById("sortSelect");
  const totalShopsCount = document.getElementById("totalShopsCount");
  const badgeAll = document.getElementById("badgeAll");
  const resultsCount = document.getElementById("resultsCount");
  const activeCategoryTitle = document.getElementById("activeCategoryTitle");
  const viewModeGrid = document.getElementById("viewModeGrid");
  const viewModeStack = document.getElementById("viewModeStack");

  // Drawer elements
  const catalogDrawer = document.getElementById("catalogDrawer");
  const catalogBackdrop = document.getElementById("catalogBackdrop");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");
  const drawerShopCategory = document.getElementById("drawerShopCategory");
  const drawerShopName = document.getElementById("drawerShopName");
  const drawerShopMeta = document.getElementById("drawerShopMeta");
  const drawerProductList = document.getElementById("drawerProductList");
  const drawerWhatsappBtn = document.getElementById("drawerWhatsappBtn");

  // Auth status area in topbar
  const authStatusArea = document.getElementById("authStatusArea");

  // Watch Real Firebase Session
  watchUserSession((user) => {
    activeUser = user;
    if (authStatusArea) {
      if (user) {
        const consoleLink = user.role !== "user"
          ? `<a href="dashboard.html" class="btn btn-primary">${user.role.toUpperCase()} Console</a>`
          : `<span class="mono-badge" style="background:#ECFDF5; color:#059669; padding:7px 11px;">CUSTOMER</span>`;

        authStatusArea.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            ${consoleLink}
            <button id="logoutBtn" class="btn btn-outline" style="font-size:12px;">Sign Out</button>
          </div>
        `;

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", async () => {
            await logoutUser();
            window.location.reload();
          });
        }
      } else {
        authStatusArea.innerHTML = `<a href="login.html" class="btn btn-primary">Sign In / Register</a>`;
      }
    }
  });

  // ReactBits Line Sidebar Category Switcher
  initLineSidebar("categoryLineNav", "catLineIndicator", (clickedItem) => {
    activeCategory = clickedItem.dataset.cat;
    if (activeCategoryTitle) {
      activeCategoryTitle.textContent =
        activeCategory === "all"
          ? "All Nearby Businesses & Factory Outlets"
          : activeCategory;
    }
    renderShops();
  });

  // View Mode Toggle (Grid vs Scroll Stack)
  if (viewModeGrid && viewModeStack) {
    viewModeGrid.addEventListener("click", () => {
      scrollStackMode = false;
      viewModeGrid.classList.add("active");
      viewModeStack.classList.remove("active");
      shopGrid.classList.remove("scroll-stack");
      shopGrid.classList.add("animated-list");
      renderShops();
    });

    viewModeStack.addEventListener("click", () => {
      scrollStackMode = true;
      viewModeStack.classList.add("active");
      viewModeGrid.classList.remove("active");
      shopGrid.classList.remove("animated-list");
      shopGrid.classList.add("scroll-stack");
      renderShops();
    });
  }

  // Open Slide-Over Catalog Drawer
  window.openShopCatalog = function(shopId) {
    const shop = liveShops.find(s => s.id === shopId);
    if (!shop || !catalogDrawer) return;

    if (drawerShopCategory) drawerShopCategory.textContent = shop.category || "General";
    if (drawerShopName) drawerShopName.textContent = shop.name;
    if (drawerShopMeta) drawerShopMeta.textContent = `📍 ${shop.distance || 0} km away • ${shop.location || "30km District Zone"}`;

    const products = (shop.products && shop.products.length > 0)
      ? shop.products
      : [{
          name: shop.featuredItem || "Wholesale Lot",
          price: shop.startingPrice || 0,
          mrp: Math.round((shop.startingPrice || 0) * 1.25),
          unit: shop.unit || "unit",
          moq: "1 unit"
        }];

    if (drawerProductList) {
      drawerProductList.innerHTML = products.map(prod => {
        const savings = Math.max(0, (prod.mrp || prod.price) - prod.price);
        return `
          <div class="catalog-item">
            <div>
              <div class="catalog-item-title">${prod.name}</div>
              <div class="catalog-item-moq">Unit: ${prod.unit} • MOQ: <strong>${prod.moq}</strong></div>
            </div>
            <div class="catalog-item-pricing">
              <div>
                <span class="catalog-sasta-price">₹${prod.price}</span>${prod.mrp > prod.price ? `<span class="catalog-mrp">₹${prod.mrp}</span>` : ''}
              </div>
              ${savings > 0 ? `<span class="savings-pill">Save ₹${savings}</span>` : ''}
            </div>
          </div>
        `;
      }).join("");
    }

    const cleanPhone = (shop.phone || "919800000000").replace(/\D/g, "");
    const waText = encodeURIComponent(`Namaskar ${shop.name}, I found your listing on ZiloMarket (30km District Hub) and would like to place an order at your wholesale rate.`);
    if (drawerWhatsappBtn) {
      drawerWhatsappBtn.href = `https://wa.me/${cleanPhone}?text=${waText}`;
    }

    catalogDrawer.classList.add("open");
    if (catalogBackdrop) catalogBackdrop.classList.add("open");
  };

  function closeDrawer() {
    if (!catalogDrawer) return;
    catalogDrawer.classList.remove("open");
    if (catalogBackdrop) catalogBackdrop.classList.remove("open");
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeDrawer);
  if (catalogBackdrop) catalogBackdrop.addEventListener("click", closeDrawer);

  // Render Shimmer Skeletons while Firestore loads
  function renderSkeletons() {
    shopGrid.innerHTML = Array.from({ length: 4 }).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-line" style="width: 40%;"></div>
        <div class="skeleton-line" style="width: 75%; height: 20px;"></div>
        <div class="skeleton-line" style="width: 60%;"></div>
        <div class="skeleton-line" style="width: 100%; height: 50px;"></div>
        <div class="skeleton-line" style="width: 100%; height: 36px;"></div>
      </div>
    `).join("");
  }

  // Render Shops
  function renderShops() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const maxRadius = radiusFilter ? parseFloat(radiusFilter.value) : 30;
    const sortBy = sortSelect ? sortSelect.value : "nearest";

    let filtered = liveShops.filter(shop => {
      const matchesCat = activeCategory === "all" || shop.category === activeCategory;
      const matchesRadius = Number(shop.distance || 0) <= maxRadius;
      const matchesQuery =
        (shop.name || "").toLowerCase().includes(query) ||
        (shop.featuredItem || "").toLowerCase().includes(query) ||
        (shop.category || "").toLowerCase().includes(query) ||
        (shop.location || "").toLowerCase().includes(query) ||
        (shop.products && shop.products.some(p => (p.name || "").toLowerCase().includes(query)));
      return matchesCat && matchesRadius && matchesQuery;
    });

    if (sortBy === "nearest") {
      filtered.sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));
    } else if (sortBy === "cheapest") {
      filtered.sort((a, b) => Number(a.startingPrice || 0) - Number(b.startingPrice || 0));
    }

    if (totalShopsCount) totalShopsCount.textContent = liveShops.length;
    if (badgeAll) badgeAll.textContent = liveShops.length;
    if (resultsCount) resultsCount.textContent = `Showing ${filtered.length} verified sellers within ${maxRadius} km`;

    // Empty State (Real Data Aware)
    if (filtered.length === 0) {
      shopGrid.innerHTML = `
        <div class="empty-radar-box">
          <div class="radar-sweep-icon">📡</div>
          <h3>${liveShops.length === 0 ? "No Shops Listed in 30km Cloud Yet" : "No matching businesses found"}</h3>
          <p>${liveShops.length === 0 
            ? "Be the first verified factory or wholesale supplier in your district zone. Publish your wholesale prices for free."
            : "Try adjusting your search query, selecting 'All Nearby Sellers', or expanding your radius to 30 km."}
          </p>
          <a href="login.html?role=business" class="btn btn-primary">
            + List Your Shop / Factory for Free
          </a>
        </div>
      `;
      return;
    }

    shopGrid.innerHTML = filtered.map(shop => {
      const cleanPhone = (shop.phone || "919800000000").replace(/\D/g, "");
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Namaskar ' + shop.name + ', I found your deal (' + shop.featuredItem + ' at ₹' + shop.startingPrice + ') on ZiloMarket 30km radar!')}`;
      const itemCount = (shop.products && shop.products.length) || 1;

      return `
        <article class="shop-card">
          <div>
            <div class="card-top">
              <span class="cat-tag">${shop.category || "General"}</span>
              <span class="distance-badge">📍 ${shop.distance || 0} km</span>
            </div>
            <h3 class="shop-title">
              ${shop.name}${shop.verified ? '<span class="verified-check" title="Verified District Business">✔</span>' : ''}
            </h3>
            <p class="shop-location">${shop.location || "District Hub"}</p>

            <div class="price-highlight-box">
              <div>
                <span class="deal-label">🔥 Direct / Sasta Deal</span>
                <span class="deal-item">${shop.featuredItem || "Wholesale Lot"}</span>
              </div>
              <div class="deal-price">
                <span class="price-val">₹${shop.startingPrice || 0}</span>
                <span class="price-unit">${shop.unit || 'starting'}</span>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn btn-outline" onclick="openShopCatalog('${shop.id}')">
              Price List (${itemCount})
            </button>
            <a href="${waLink}" target="_blank" class="btn btn-primary">
              WhatsApp Order
            </a>
          </div>
        </article>
      `;
    }).join("");
  }

  if (searchInput) searchInput.addEventListener("input", renderShops);
  if (radiusFilter) radiusFilter.addEventListener("change", renderShops);
  if (sortSelect) sortSelect.addEventListener("change", renderShops);

  // Initial Fetch from Real Firestore
  renderSkeletons();
  fetchLiveShops().then((shops) => {
    liveShops = shops;
    renderShops();
  });
}

// ============================================================================
// 2. LIVE FIREBASE AUTH & ONBOARDING CONTROLLER (login.html)
// ============================================================================
const authForm = document.getElementById("authForm");

if (authForm) {
  let isRegisterMode = false;
  let selectedRole = "user";

  const authModeTabs = document.getElementById("authModeTabs");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const roleButtons = document.querySelectorAll("#roleSelector .role-btn");
  const businessExtraFields = document.getElementById("businessExtraFields");
  const authMessage = document.getElementById("authMessage");
  const submitBtn = document.getElementById("submitBtn");

  const formRoleEyebrow = document.getElementById("formRoleEyebrow");
  const formMainHeading = document.getElementById("formMainHeading");
  const formSubHeading = document.getElementById("formSubHeading");
  const hudRoleCode = document.getElementById("hudRoleCode");
  const hudRoleTitle = document.getElementById("hudRoleTitle");
  const hudRoleDesc = document.getElementById("hudRoleDesc");

  const ROLE_META = {
    user: {
      eyebrow: "PORTAL 01 • CUSTOMER ACCESS",
      heading: "Sign in to Customer Radar",
      sub: "Search nearby shops within 30 km and compare lowest direct rates.",
      hudCode: "NODE // CUSTOMER_RADAR_30KM",
      hudTitle: "30km Price Discovery Sphere",
      hudDesc: "Real-time spatial mesh scanning verified local shops and direct factory deals.",
      colorHex: 0x0284c7
    },
    business: {
      eyebrow: "PORTAL 02 • VENDOR & FACTORY PARTNER",
      heading: "Business & Factory Portal",
      sub: "Publish your wholesale catalog and receive direct WhatsApp orders.",
      hudCode: "NODE // VENDOR_SUPPLY_CUBE",
      hudTitle: "Direct Factory Supply Lattice",
      hudDesc: "Zero-middleman inventory node for local manufacturers and distributors.",
      colorHex: 0x059669
    },
    team: {
      eyebrow: "PORTAL 03 • ZILOMARKET FIELD TEAM",
      heading: "Team Verification Console",
      sub: "Inspect local store distances, verify stock rates, and approve trust badges.",
      hudCode: "NODE // TEAM_VERIFY_SHIELD",
      hudTitle: "District Trust & Audit Shield",
      hudDesc: "Field verification layer protecting 30km buyers from inflated retail pricing.",
      colorHex: 0xd97706
    },
    admin: {
      eyebrow: "PORTAL 04 • SUPERUSER COMMAND",
      heading: "Admin Command Center",
      sub: "Full RBAC authority over 30km zones, vendor approvals, and live Firestore sync.",
      hudCode: "NODE // ADMIN_CORE_TORUS",
      hudTitle: "ZiloMarket Command Core",
      hudDesc: "High-privilege administrative nexus governing all district marketplace nodes.",
      colorHex: 0x7c3aed
    }
  };

  // --------------------------------------------------------------------------
  // A. THREE.JS REACTIVE 3D WEBGL SPATIAL MODEL
  // --------------------------------------------------------------------------
  let set3DRoleGeometry = () => {};
  const canvas = document.getElementById("zilo3DCanvas");

  if (canvas && window.THREE) {
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, (canvas.clientWidth || 300) / (canvas.clientHeight || 240), 0.1, 1000);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 240);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Outer 30km Orbital Radar Ring
    const ringGeo = new THREE.TorusGeometry(1.85, 0.015, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.45 });
    const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
    orbitalRing.rotation.x = Math.PI / 2.6;
    mainGroup.add(orbitalRing);

    // Core Wireframe + Inner Glowing Solid Mesh
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x059669, wireframe: true, transparent: true, opacity: 0.85 });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.16 });

    let wireMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.18, 1), wireMat);
    let coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.12, 1), coreMat);
    mainGroup.add(wireMesh);
    mainGroup.add(coreMesh);

    set3DRoleGeometry = function(roleKey) {
      const meta = ROLE_META[roleKey] || ROLE_META.user;
      let newGeo;
      if (roleKey === "user") {
        newGeo = new THREE.IcosahedronGeometry(1.18, 1);
      } else if (roleKey === "business") {
        newGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5, 2, 2, 2);
      } else if (roleKey === "team") {
        newGeo = new THREE.OctahedronGeometry(1.25, 0);
      } else {
        newGeo = new THREE.TorusKnotGeometry(0.8, 0.24, 64, 12);
      }

      wireMesh.geometry.dispose();
      coreMesh.geometry.dispose();
      wireMesh.geometry = newGeo;
      coreMesh.geometry = newGeo.clone();

      wireMat.color.setHex(meta.colorHex);
      coreMat.color.setHex(meta.colorHex);
      ringMat.color.setHex(meta.colorHex);

      mainGroup.scale.set(0.85, 0.85, 0.85);
    };

    let targetRotX = 0;
    let targetRotY = 0;

    window.addEventListener("mousemove", (e) => {
      targetRotY = ((e.clientX / window.innerWidth) - 0.5) * 1.3;
      targetRotX = ((e.clientY / window.innerHeight) - 0.5) * 1.0;
    });

    function animate3D() {
      requestAnimationFrame(animate3D);
      wireMesh.rotation.y += 0.007;
      wireMesh.rotation.x += 0.004;
      coreMesh.rotation.y = wireMesh.rotation.y;
      coreMesh.rotation.x = wireMesh.rotation.x;
      orbitalRing.rotation.z -= 0.005;

      mainGroup.rotation.y += (targetRotY - mainGroup.rotation.y) * 0.08;
      mainGroup.rotation.x += (targetRotX - mainGroup.rotation.x) * 0.08;
      mainGroup.scale.x += (1 - mainGroup.scale.x) * 0.1;
      mainGroup.scale.y += (1 - mainGroup.scale.y) * 0.1;
      mainGroup.scale.z += (1 - mainGroup.scale.z) * 0.1;

      renderer.render(scene, camera);
    }
    animate3D();

    window.addEventListener("resize", () => {
      if (!canvas) return;
      camera.aspect = (canvas.clientWidth || 300) / (canvas.clientHeight || 240);
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 240);
    });
  }

  // --------------------------------------------------------------------------
  // B. REACTBITS 3D TILT STAGE + SPOTLIGHT CURSOR TRACKER
  // --------------------------------------------------------------------------
  const tilt3DCard = document.getElementById("tilt3DCard");
  if (tilt3DCard) {
    tilt3DCard.addEventListener("mousemove", (e) => {
      const rect = tilt3DCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      tilt3DCard.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
    });
    tilt3DCard.addEventListener("mouseleave", () => {
      tilt3DCard.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    });
  }

  const authSpotlightCard = document.getElementById("authSpotlightCard");
  if (authSpotlightCard) {
    authSpotlightCard.addEventListener("mousemove", (e) => {
      const rect = authSpotlightCard.getBoundingClientRect();
      authSpotlightCard.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      authSpotlightCard.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    });
  }

  // --------------------------------------------------------------------------
  // C. REACTBITS LINE SIDEBAR FOR ROLE SELECTION
  // --------------------------------------------------------------------------
  const authRoleLineIndicator = document.getElementById("authRoleLineIndicator");

  function syncRoleLineIndicator(targetBtn) {
    if (!authRoleLineIndicator || !targetBtn) return;
    authRoleLineIndicator.style.transform = `translateY(${targetBtn.offsetTop}px)`;
    authRoleLineIndicator.style.height = `${targetBtn.offsetHeight}px`;
  }

  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get("role");
  if (urlRole && ROLE_META[urlRole]) {
    selectedRole = urlRole;
    if (urlRole === "business") isRegisterMode = true;
  }

  function updateAuthUI() {
    const meta = ROLE_META[selectedRole] || ROLE_META.user;

    if (tabLogin) tabLogin.classList.toggle("active", !isRegisterMode);
    if (tabRegister) tabRegister.classList.toggle("active", isRegisterMode);
    if (authModeTabs) {
      authModeTabs.classList.toggle("register-mode", isRegisterMode);
    }

    roleButtons.forEach(btn => {
      const isMatch = btn.dataset.role === selectedRole;
      btn.classList.toggle("active", isMatch);
      if (isMatch) syncRoleLineIndicator(btn);
    });

    if (formRoleEyebrow) formRoleEyebrow.textContent = meta.eyebrow;
    if (formMainHeading) {
      formMainHeading.textContent = isRegisterMode
        ? (selectedRole === "business" ? "List Your Shop / Factory Free" : `Create ${selectedRole.toUpperCase()} Account`)
        : meta.heading;
    }
    if (formSubHeading) formSubHeading.textContent = meta.sub;
    if (hudRoleCode) hudRoleCode.textContent = meta.hudCode;
    if (hudRoleTitle) hudRoleTitle.textContent = meta.hudTitle;
    if (hudRoleDesc) hudRoleDesc.textContent = meta.hudDesc;

    set3DRoleGeometry(selectedRole);

    if (businessExtraFields && submitBtn) {
      if (isRegisterMode && selectedRole === "business") {
        businessExtraFields.classList.add("show");
        submitBtn.innerHTML = `<span>Register Business &amp; Launch Dashboard →</span>`;
      } else if (isRegisterMode) {
        businessExtraFields.classList.remove("show");
        submitBtn.innerHTML = `<span>Create ${selectedRole.toUpperCase()} Account →</span>`;
      } else {
        businessExtraFields.classList.remove("show");
        submitBtn.innerHTML = `<span>Sign In as ${selectedRole.toUpperCase()} →</span>`;
      }
    }
  }

  if (tabLogin) tabLogin.addEventListener("click", () => { isRegisterMode = false; updateAuthUI(); });
  if (tabRegister) tabRegister.addEventListener("click", () => { isRegisterMode = true; updateAuthUI(); });

  roleButtons.forEach(btn => {
    btn.addEventListener("mouseenter", () => syncRoleLineIndicator(btn));
    btn.addEventListener("click", () => {
      selectedRole = btn.dataset.role;
      updateAuthUI();
    });
  });

  const roleTrack = document.getElementById("roleSelector");
  if (roleTrack) {
    roleTrack.addEventListener("mouseleave", () => {
      const activeBtn = roleTrack.querySelector(".role-btn.active");
      syncRoleLineIndicator(activeBtn);
    });
  }

  // Keyboard shortcuts 1-4
  window.addEventListener("keydown", (e) => {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    const keyMap = { "1": "user", "2": "business", "3": "team", "4": "admin" };
    if (keyMap[e.key]) {
      selectedRole = keyMap[e.key];
      updateAuthUI();
    }
  });

  // Password Show/Hide Toggle
  const togglePassBtn = document.getElementById("togglePassBtn");
  const passwordInput = document.getElementById("passwordInput");
  if (togglePassBtn && passwordInput) {
    togglePassBtn.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      togglePassBtn.textContent = isHidden ? "Hide" : "Show";
    });
  }

  // --------------------------------------------------------------------------
  // D. REAL FIREBASE AUTHENTICATION & BUSINESS SHOP CREATION
  // --------------------------------------------------------------------------
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById("emailInput");
    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email || !password) {
      if (authMessage) {
        authMessage.style.color = "#DC2626";
        authMessage.textContent = "Please enter both email and password.";
      }
      return;
    }

    if (password.length < 6) {
      if (authMessage) {
        authMessage.style.color = "#DC2626";
        authMessage.textContent = "Password must be at least 6 characters.";
      }
      return;
    }

    // Set Button Loading State
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Connecting to Firebase Cloud...</span>`;
    if (authMessage) {
      authMessage.style.color = "#059669";
      authMessage.textContent = isRegisterMode ? "Creating account in Firebase..." : "Authenticating session...";
    }

    try {
      if (isRegisterMode) {
        let shopDetails = null;
        if (selectedRole === "business") {
          const shopNameEl = document.getElementById("shopName");
          const shopCategoryEl = document.getElementById("shopCategory");
          const shopDistanceEl = document.getElementById("shopDistance");
          const featuredItemEl = document.getElementById("featuredItem");
          const startingPriceEl = document.getElementById("startingPrice");
          const shopLocationEl = document.getElementById("shopLocation");
          const shopPhoneEl = document.getElementById("shopPhone");

          shopDetails = {
            name: (shopNameEl && shopNameEl.value.trim()) || "New Local Business",
            category: (shopCategoryEl && shopCategoryEl.value) || "Manufacturing & Disposables",
            distance: (shopDistanceEl && parseFloat(shopDistanceEl.value)) || 1.5,
            featuredItem: (featuredItemEl && featuredItemEl.value.trim()) || "Wholesale Supply",
            startingPrice: (startingPriceEl && parseFloat(startingPriceEl.value)) || 99,
            location: (shopLocationEl && shopLocationEl.value.trim()) || "Within 30km District Zone",
            phone: (shopPhoneEl && shopPhoneEl.value.trim()) || "919800000000",
            unit: "wholesale pack",
            moq: "1 lot"
          };
        }

        await registerUserWithRole(email, password, selectedRole, shopDetails);
        if (authMessage) {
          authMessage.style.color = "#059669";
          authMessage.textContent = "✔ Account & profile created in Firebase Firestore!";
        }
      } else {
        await loginUser(email, password);
        if (authMessage) {
          authMessage.style.color = "#059669";
          authMessage.textContent = "✔ Authenticated! Launching workspace...";
        }
      }

      const targetPage = selectedRole === "user" ? "index.html" : "dashboard.html";
      setTimeout(() => {
        window.location.href = targetPage;
      }, 500);

    } catch (err) {
      console.error("Firebase Auth Error:", err);
      submitBtn.disabled = false;
      updateAuthUI();

      let friendlyError = "Authentication failed. Please check your credentials.";
      if (err.code === "auth/email-already-in-use") {
        friendlyError = "An account with this email already exists. Please Sign In instead.";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        friendlyError = "Incorrect email or password. Please try again.";
      } else if (err.code === "auth/user-not-found") {
        friendlyError = "No account found with this email. Please Create an Account.";
      } else if (err.code === "auth/weak-password") {
        friendlyError = "Password should be at least 6 characters long.";
      } else if (err.message) {
        friendlyError = err.message;
      }

      if (authMessage) {
        authMessage.style.color = "#DC2626";
        authMessage.textContent = friendlyError;
      }
    }
  });

  requestAnimationFrame(() => updateAuthUI());
}

// ============================================================================
// 3. LIVE FIRESTORE DASHBOARD CONTROLLER (dashboard.html)
// ============================================================================
const vendorWorkspace = document.getElementById("vendorWorkspace");
const adminWorkspace = document.getElementById("adminWorkspace");

if (vendorWorkspace || adminWorkspace) {
  const dashRoleBanner = document.getElementById("dashRoleBanner");
  const dashSubTag = document.getElementById("dashSubTag");
  const dashLogoutBtn = document.getElementById("dashLogoutBtn");
  const navBtnVendor = document.getElementById("navBtnVendor");
  const navBtnAdmin = document.getElementById("navBtnAdmin");
  const vendorShopSelect = document.getElementById("vendorShopSelect");
  const vendorCatalogList = document.getElementById("vendorCatalogList");
  const addProductForm = document.getElementById("addProductForm");
  const adminShopTableBody = document.getElementById("adminShopTableBody");

  function switchDashboardTab(viewName) {
    if (viewName === "admin") {
      if (vendorWorkspace) vendorWorkspace.style.display = "none";
      if (adminWorkspace) adminWorkspace.style.display = "block";
      if (navBtnVendor) navBtnVendor.classList.remove("active");
      if (navBtnAdmin) navBtnAdmin.classList.add("active");
    } else {
      if (vendorWorkspace) vendorWorkspace.style.display = "block";
      if (adminWorkspace) adminWorkspace.style.display = "none";
      if (navBtnVendor) navBtnVendor.classList.add("active");
      if (navBtnAdmin) navBtnAdmin.classList.remove("active");
    }
  }

  // ReactBits Line Sidebar in Workspace
  initLineSidebar("dashLineNav", "dashLineIndicator", (clickedBtn) => {
    if (clickedBtn.dataset.view) {
      switchDashboardTab(clickedBtn.dataset.view);
    }
  });

  // Real Session Enforcement
  watchUserSession(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    activeUser = user;

    if (dashRoleBanner) {
      dashRoleBanner.innerHTML = `Signed in as <strong>${user.email}</strong> (${user.role.toUpperCase()} PORTAL)`;
    }
    if (dashSubTag) {
      dashSubTag.textContent = `${user.role.toUpperCase()} WORKSPACE`;
    }

    if (user.role === "admin" || user.role === "team") {
      switchDashboardTab("admin");
    } else {
      switchDashboardTab("vendor");
    }

    // Fetch Real Live Shops from Firestore
    liveShops = await fetchLiveShops();
    loadVendorShops();
    renderAdminTable();
  });

  if (dashLogoutBtn) {
    dashLogoutBtn.addEventListener("click", async () => {
      await logoutUser();
      window.location.href = "login.html";
    });
  }

  function loadVendorShops() {
    if (!vendorShopSelect) return;
    // Show shops owned by this user (or all if admin)
    const myShops = activeUser?.role === "admin"
      ? liveShops
      : liveShops.filter(s => s.ownerUid === activeUser?.uid);

    if (myShops.length === 0) {
      vendorShopSelect.innerHTML = `<option value="">No shop found for this account</option>`;
      if (vendorCatalogList) {
        vendorCatalogList.innerHTML = `
          <div style="padding: 24px; text-align:center; background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:12px;">
            <p style="font-size:13.5px; color:#475569; margin-bottom:12px;">
              You have not listed a shop yet. Create your free 30km listing on the registration portal.
            </p>
            <a href="login.html?role=business" class="btn btn-primary" style="font-size:12.5px;">+ Register Shop Now</a>
          </div>
        `;
      }
      return;
    }

    vendorShopSelect.innerHTML = myShops.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    renderVendorProducts();
  }

  function renderVendorProducts() {
    if (!vendorCatalogList || !vendorShopSelect) return;
    const selectedShop = liveShops.find(s => s.id === vendorShopSelect.value);
    if (!selectedShop) return;

    const products = selectedShop.products || [];
    if (products.length === 0) {
      vendorCatalogList.innerHTML = `<p style="font-size:13px; color:#64748B;">No products published yet in this shop. Add your first item using the form on the left.</p>`;
      return;
    }

    vendorCatalogList.innerHTML = products.map(p => `
      <div class="catalog-item">
        <div>
          <div class="catalog-item-title">${p.name}</div>
          <div class="catalog-item-moq">Unit: ${p.unit} • MOQ: ${p.moq}</div>
        </div>
        <div class="catalog-item-pricing">
          <span class="catalog-sasta-price">₹${p.price}</span>
          ${p.mrp ? `<span class="catalog-mrp">₹${p.mrp}</span>` : ''}
        </div>
      </div>
    `).join("");
  }

  if (vendorShopSelect) {
    vendorShopSelect.addEventListener("change", renderVendorProducts);
  }

  if (addProductForm) {
    addProductForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const selectedShop = liveShops.find(s => s.id === vendorShopSelect.value);
      if (!selectedShop) {
        alert("Please select or register a valid shop first.");
        return;
      }

      const publishBtn = document.getElementById("publishItemBtn");
      if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.textContent = "Publishing to Firestore Cloud...";
      }

      const newProd = {
        id: "prod_" + Date.now(),
        name: document.getElementById("prodName").value.trim(),
        price: parseFloat(document.getElementById("prodPrice").value),
        mrp: parseFloat(document.getElementById("prodMrp").value),
        unit: document.getElementById("prodUnit").value.trim(),
        moq: document.getElementById("prodMoq").value.trim()
      };

      try {
        await addProductToShop(selectedShop.id, newProd, selectedShop.startingPrice);
        liveShops = await fetchLiveShops();
        addProductForm.reset();
        renderVendorProducts();
        renderAdminTable();
        alert("✔ Product published live to 30km Firestore radar!");
      } catch (err) {
        console.error("Error publishing product:", err);
        alert("Error saving product to Firestore: " + err.message);
      } finally {
        if (publishBtn) {
          publishBtn.disabled = false;
          publishBtn.textContent = "Publish Item to 30km Radar";
        }
      }
    });
  }

  window.toggleVerifyShop = async function(shopId) {
    const target = liveShops.find(s => s.id === shopId);
    if (!target) return;
    try {
      await updateShopVerification(shopId, !target.verified);
      liveShops = await fetchLiveShops();
      renderAdminTable();
    } catch (err) {
      console.error("Verification update error:", err);
      alert("Error updating verification: " + err.message);
    }
  };

  window.deleteShopListing = async function(shopId) {
    if (!confirm("Permanently delete this shop listing from Firebase Firestore?")) return;
    try {
      await removeShopFromDB(shopId);
      liveShops = await fetchLiveShops();
      renderAdminTable();
      loadVendorShops();
    } catch (err) {
      console.error("Delete shop error:", err);
      alert("Error deleting shop: " + err.message);
    }
  };

  function renderAdminTable() {
    if (!adminShopTableBody) return;
    if (liveShops.length === 0) {
      adminShopTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:32px; color:#64748B;">
            No registered businesses in Firestore yet.
          </td>
        </tr>
      `;
      return;
    }

    adminShopTableBody.innerHTML = liveShops.map(s => `
      <tr>
        <td>
          <strong>${s.name}</strong><br>
          <small style="color:#64748B;">${s.ownerEmail || "District Seller"} • ${s.phone || ""}</small>
        </td>
        <td>${s.category || "General"}</td>
        <td class="mono-text">${s.distance || 0} km</td>
        <td class="mono-text">₹${s.startingPrice || 0} (${s.featuredItem || "Deal"})</td>
        <td>
          <span class="status-badge ${s.verified ? 'verified' : 'pending'}">
            ${s.verified ? '✔ Verified' : 'Pending Audit'}
          </span>
        </td>
        <td style="display:flex; gap:8px;">
          <button class="btn btn-outline" style="padding:5px 10px; font-size:12px;" onclick="toggleVerifyShop('${s.id}')">
            ${s.verified ? 'Revoke' : 'Verify ✔'}
          </button>
          <button class="btn btn-outline" style="padding:5px 10px; font-size:12px; color:#DC2626;" onclick="deleteShopListing('${s.id}')">
            Delete
          </button>
        </td>
      </tr>
    `).join("");
  }
}
