// ============================================================================
// ZILOMARKET STEP 3: REACTBITS LINE SIDEBAR + FIREBASE SYNC + RBAC PORTALS
// ============================================================================

import {
  initCloudDB,
  syncShopsFromCloud,
  saveShopToCloud,
  deleteShopFromCloud
} from "./firebase-db.js";

const DEFAULT_SHOPS = [
  {
    id: "shop-1",
    name: "Puthal Paper Plate Manufacturing",
    category: "Manufacturing & Disposables",
    distance: 1.2,
    featuredItem: "Buffet & Silver Paper Plates (Bulk Pack)",
    startingPrice: 35,
    unit: "per bundle",
    location: "Oupada, Balasore • Direct Factory Rate",
    phone: "919800000001",
    verified: true,
    products: [
      { id: "p1", name: "12-Inch Heavy Buffet Paper Plate (100 pcs)", price: 65, mrp: 95, unit: "per pack", moq: "10 packs" },
      { id: "p2", name: "6-Inch Silver Laminated Dona Bowl (100 pcs)", price: 35, mrp: 55, unit: "per bundle", moq: "20 bundles" },
      { id: "p3", name: "Eco-Friendly Compartmental Meal Tray", price: 110, mrp: 150, unit: "per 100 pcs", moq: "5 packs" },
      { id: "p4", name: "Raw Silver Laminated Paper Roll (Factory Supply)", price: 58, mrp: 68, unit: "per kg", moq: "50 kg" }
    ]
  },
  {
    id: "shop-2",
    name: "Mahapatra Wholesale Kirana Hub",
    category: "Wholesale Grocery",
    distance: 4.8,
    featuredItem: "25kg Loose Sugar & Mustard Oil Carton",
    startingPrice: 980,
    unit: "wholesale lot",
    location: "Soro Main Market • 4.8 km away",
    phone: "919800000002",
    verified: true,
    products: [
      { id: "p5", name: "Refined Sunflower Oil (15 Litre Tin)", price: 1780, mrp: 2050, unit: "per tin", moq: "1 tin" },
      { id: "p6", name: "Special Boiled Rice (25kg Wholesale Bag)", price: 980, mrp: 1180, unit: "per 25kg bag", moq: "1 bag" }
    ]
  },
  {
    id: "shop-3",
    name: "Kalinga Agro & Hardware Traders",
    category: "Hardware & Building",
    distance: 11.5,
    featuredItem: "PVC Pipes, Water Tanks & Cement Bags",
    startingPrice: 340,
    unit: "per bag/unit",
    location: "NH-16 Crossing • 11.5 km away",
    phone: "919800000003",
    verified: true,
    products: [
      { id: "p7", name: "4-Inch Heavy PVC Agricultural Pipe (20 ft)", price: 420, mrp: 540, unit: "per pipe", moq: "5 pipes" },
      { id: "p8", name: "500L Triple-Layer Overhead Water Tank", price: 2450, mrp: 3100, unit: "per tank", moq: "1 unit" }
    ]
  },
  {
    id: "shop-4",
    name: "Odisha Packaging & Disposables",
    category: "Manufacturing & Disposables",
    distance: 18.0,
    featuredItem: "Biodegradable Dona & Meal Trays",
    startingPrice: 48,
    unit: "per bundle",
    location: "Balasore Industrial Estate • 18 km away",
    phone: "919800000004",
    verified: true,
    products: [
      { id: "p9", name: "250ml Paper Tea Cups (1000 pcs Box)", price: 480, mrp: 650, unit: "per box", moq: "2 boxes" }
    ]
  }
];

function getShops() {
  const saved = localStorage.getItem("zilo_shops_v2");
  if (!saved) {
    localStorage.setItem("zilo_shops_v2", JSON.stringify(DEFAULT_SHOPS));
    return DEFAULT_SHOPS;
  }
  return JSON.parse(saved);
}

function saveShops(shops) {
  localStorage.setItem("zilo_shops_v2", JSON.stringify(shops));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("zilo_user") || "null");
}

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

  // Initial position on active item
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
// 1. MARKETPLACE DIRECTORY + LINE SIDEBAR FILTERING (index.html)
// ============================================================================
const shopGrid = document.getElementById("shopGrid");

if (shopGrid) {
  let activeCategory = "all";
  const searchInput = document.getElementById("searchInput");
  const radiusFilter = document.getElementById("radiusFilter");
  const sortSelect = document.getElementById("sortSelect");
  const totalShopsCount = document.getElementById("totalShopsCount");
  const badgeAll = document.getElementById("badgeAll");
  const resultsCount = document.getElementById("resultsCount");
  const activeCategoryTitle = document.getElementById("activeCategoryTitle");

  // Drawer elements
  const catalogDrawer = document.getElementById("catalogDrawer");
  const catalogBackdrop = document.getElementById("catalogBackdrop");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");
  const drawerShopCategory = document.getElementById("drawerShopCategory");
  const drawerShopName = document.getElementById("drawerShopName");
  const drawerShopMeta = document.getElementById("drawerShopMeta");
  const drawerProductList = document.getElementById("drawerProductList");
  const drawerWhatsappBtn = document.getElementById("drawerWhatsappBtn");

  // Auth status in header
  const currentUser = getCurrentUser();
  const authStatusArea = document.getElementById("authStatusArea");

  if (currentUser && authStatusArea) {
    const dashboardLink = currentUser.role !== "user"
      ? `<a href="dashboard.html" class="btn btn-primary">${currentUser.role.toUpperCase()} Console</a>`
      : `<span class="mono-badge" style="background:#ECFDF5; color:#059669; padding:6px 10px;">CUSTOMER</span>`;

    authStatusArea.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        ${dashboardLink}
        <button id="logoutBtn" class="btn btn-outline">Sign Out</button>
      </div>
    `;
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("zilo_user");
        window.location.reload();
      });
    }
  }

  // Activate ReactBits Line Sidebar for Categories
  initLineSidebar("categoryLineNav", "catLineIndicator", (clickedItem) => {
    activeCategory = clickedItem.dataset.cat;
    activeCategoryTitle.textContent =
      activeCategory === "all"
        ? "All Nearby Businesses & Factory Outlets"
        : activeCategory;
    renderShops();
  });

  window.openShopCatalog = function(shopId) {
    const shops = getShops();
    const shop = shops.find(s => s.id === shopId);
    if (!shop || !catalogDrawer) return;

    drawerShopCategory.textContent = shop.category;
    drawerShopName.textContent = shop.name;
    drawerShopMeta.textContent = `📍 ${shop.distance} km away • ${shop.location}`;

    const products = shop.products || [
      { name: shop.featuredItem, price: shop.startingPrice, mrp: Math.round(shop.startingPrice * 1.25), unit: shop.unit || "unit", moq: "Standard" }
    ];

    drawerProductList.innerHTML = products.map(prod => {
      const savings = Math.max(0, (prod.mrp || prod.price) - prod.price);
      return `
        <div class="catalog-item">
          <div>
            <div class="catalog-item-title">${prod.name}</div>
            <div class="catalog-item-moq">Unit: ${prod.unit} • Min Order: <strong>${prod.moq}</strong></div>
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

    const waText = encodeURIComponent(`Namaskar ${shop.name}, I saw your wholesale price list on ZiloMarket (30km Hub) and want to enquire about ordering.`);
    drawerWhatsappBtn.href = `https://wa.me/${shop.phone || '919800000000'}?text=${waText}`;

    catalogDrawer.classList.add("open");
    catalogBackdrop.classList.add("open");
  };

  function closeDrawer() {
    if (!catalogDrawer) return;
    catalogDrawer.classList.remove("open");
    catalogBackdrop.classList.remove("open");
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeDrawer);
  if (catalogBackdrop) catalogBackdrop.addEventListener("click", closeDrawer);

  function renderShops() {
    const shops = getShops();
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const maxRadius = radiusFilter ? parseFloat(radiusFilter.value) : 30;
    const sortBy = sortSelect ? sortSelect.value : "nearest";

    let filtered = shops.filter(shop => {
      const matchesCat = activeCategory === "all" || shop.category === activeCategory;
      const matchesRadius = shop.distance <= maxRadius;
      const matchesQuery =
        shop.name.toLowerCase().includes(query) ||
        shop.featuredItem.toLowerCase().includes(query) ||
        shop.category.toLowerCase().includes(query) ||
        shop.location.toLowerCase().includes(query) ||
        (shop.products && shop.products.some(p => p.name.toLowerCase().includes(query)));
      return matchesCat && matchesRadius && matchesQuery;
    });

    if (sortBy === "nearest") {
      filtered.sort((a, b) => a.distance - b.distance);
    } else if (sortBy === "cheapest") {
      filtered.sort((a, b) => a.startingPrice - b.startingPrice);
    }

    if (totalShopsCount) totalShopsCount.textContent = shops.length;
    if (badgeAll) badgeAll.textContent = shops.length;
    if (resultsCount) resultsCount.textContent = `Showing ${filtered.length} verified shops within ${maxRadius} km`;

    if (filtered.length === 0) {
      shopGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 48px; background:#fff; border:1px solid #E2E8F0; border-radius:12px;">
          <h3 style="margin-bottom:6px;">No shops found matching your filter</h3>
          <p style="color:#64748B; font-size:14px;">Try expanding your radius to 30 km or selecting 'All Nearby Shops' in the Line Sidebar.</p>
        </div>
      `;
      return;
    }

    shopGrid.innerHTML = filtered.map(shop => {
      const waLink = `https://wa.me/${shop.phone || '919800000000'}?text=${encodeURIComponent('Hi ' + shop.name + ', I found your deal (' + shop.featuredItem + ' at ₹' + shop.startingPrice + ') on ZiloMarket!')}`;
      const itemCount = shop.products ? shop.products.length : 1;

      return `
        <article class="shop-card">
          <div>
            <div class="card-top">
              <span class="cat-tag">${shop.category}</span>
              <span class="distance-badge">📍 ${shop.distance} km</span>
            </div>
            <h3 class="shop-title">
              ${shop.name}${shop.verified ? '<span class="verified-check" title="Verified Local Business">✔</span>' : ''}
            </h3>
            <p class="shop-location">${shop.location}</p>

            <div class="price-highlight-box">
              <div>
                <span class="deal-label">🔥 Sasta / Direct Deal</span>
                <span class="deal-item">${shop.featuredItem}</span>
              </div>
              <div class="deal-price">
                <span class="price-val">₹${shop.startingPrice}</span>
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

  // Initial Render + Cloud Sync Check
  renderShops();
  initCloudDB().then(async (isCloudLive) => {
    if (isCloudLive) {
      await syncShopsFromCloud(getShops());
      renderShops();
    }
  });
}

// ============================================================================
// 2. PRO MAX 3D REACTIVE PORTAL + REACTBITS LINE SIDEBAR AUTH (login.html)
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

  // Dynamic Headings & 3D HUD Labels
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
      hudDesc: "Real-time spatial mesh scanning verified local shops and sasta factory deals.",
      colorHex: 0x38bdf8,
      accentCss: "#0284C7"
    },
    business: {
      eyebrow: "PORTAL 02 • VENDOR & FACTORY PARTNER",
      heading: "Business & Factory Portal",
      sub: "Publish your wholesale catalog and receive direct WhatsApp orders.",
      hudCode: "NODE // VENDOR_SUPPLY_CUBE",
      hudTitle: "Direct Factory Supply Lattice",
      hudDesc: "Zero-middleman inventory node for manufacturers like Puthal Paper Plate.",
      colorHex: 0x10b981,
      accentCss: "#059669"
    },
    team: {
      eyebrow: "PORTAL 03 • ZILOMARKET FIELD TEAM",
      heading: "Team Verification Console",
      sub: "Inspect local store distances, verify stock rates, and approve trust badges.",
      hudCode: "NODE // TEAM_VERIFY_SHIELD",
      hudTitle: "District Trust & Audit Shield",
      hudDesc: "Field verification layer protecting 30km buyers from inflated pricing.",
      colorHex: 0xf59e0b,
      accentCss: "#D97706"
    },
    admin: {
      eyebrow: "PORTAL 04 • SUPERUSER COMMAND",
      heading: "Admin Command Center",
      sub: "Full RBAC authority over 30km zones, vendor approvals, and Firebase sync.",
      hudCode: "NODE // ADMIN_CORE_TORUS",
      hudTitle: "ZiloMarket Command Core",
      hudDesc: "High-privilege administrative nexus governing all 30km district nodes.",
      colorHex: 0xa855f7,
      accentCss: "#7C3AED"
    }
  };

  // --------------------------------------------------------------------------
  // A. THREE.JS REACTIVE 3D WEBGL MODEL (Morphs by Role + Tracks Mouse)
  // --------------------------------------------------------------------------
  let set3DRoleGeometry = () => {};
  const canvas = document.getElementById("zilo3DCanvas");

  if (canvas && window.THREE) {
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, (canvas.clientWidth || 300) / (canvas.clientHeight || 250), 0.1, 1000);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 250);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Outer 30km Orbital Radar Ring
    const ringGeo = new THREE.TorusGeometry(1.85, 0.015, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
    const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
    orbitalRing.rotation.x = Math.PI / 2.6;
    mainGroup.add(orbitalRing);

    // Core Wireframe + Inner Glowing Solid Mesh
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.85 });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16 });

    let wireMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.18, 1), wireMat);
    let coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.12, 1), coreMat);
    mainGroup.add(wireMesh);
    mainGroup.add(coreMesh);

    set3DRoleGeometry = function(roleKey) {
      const meta = ROLE_META[roleKey] || ROLE_META.user;
      let newGeo;
      if (roleKey === "user") {
        newGeo = new THREE.IcosahedronGeometry(1.18, 1); // 30km Geodesic Sphere
      } else if (roleKey === "business") {
        newGeo = new THREE.BoxGeometry(1.55, 1.55, 1.55, 2, 2, 2); // Factory Supply Cube
      } else if (roleKey === "team") {
        newGeo = new THREE.OctahedronGeometry(1.28, 0); // Verification Shield Diamond
      } else {
        newGeo = new THREE.TorusKnotGeometry(0.82, 0.25, 64, 12); // Admin Command Core
      }

      wireMesh.geometry.dispose();
      coreMesh.geometry.dispose();
      wireMesh.geometry = newGeo;
      coreMesh.geometry = newGeo.clone();

      wireMat.color.setHex(meta.colorHex);
      coreMat.color.setHex(meta.colorHex);
      ringMat.color.setHex(meta.colorHex);

      // Subtle pulse scale animation on switch
      mainGroup.scale.set(0.82, 0.82, 0.82);
    };

    let targetRotX = 0;
    let targetRotY = 0;

    window.addEventListener("mousemove", (e) => {
      targetRotY = ((e.clientX / window.innerWidth) - 0.5) * 1.4;
      targetRotX = ((e.clientY / window.innerHeight) - 0.5) * 1.1;
    });

    function animate3D() {
      requestAnimationFrame(animate3D);
      wireMesh.rotation.y += 0.007;
      wireMesh.rotation.x += 0.004;
      coreMesh.rotation.y = wireMesh.rotation.y;
      coreMesh.rotation.x = wireMesh.rotation.x;
      orbitalRing.rotation.z -= 0.005;

      // Smooth spring interpolation toward cursor & scale
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
      camera.aspect = (canvas.clientWidth || 300) / (canvas.clientHeight || 250);
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 250);
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
      tilt3DCard.style.transform = `perspective(900px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
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
        ? (selectedRole === "business" ? "List Your Business on 30km Radar" : `Create ${selectedRole.toUpperCase()} Account`)
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
        submitBtn.textContent = "Register Business & Launch Seller Dashboard →";
      } else if (isRegisterMode) {
        businessExtraFields.classList.remove("show");
        submitBtn.textContent = `Create ${selectedRole.toUpperCase()} Account →`;
      } else {
        businessExtraFields.classList.remove("show");
        submitBtn.textContent = `Sign In as ${selectedRole.toUpperCase()} →`;
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

  // Keyboard shortcuts 1-4 to switch roles like a pro terminal
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

  // 1-Click Demo Access Chips
  document.querySelectorAll(".demo-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      selectedRole = chip.dataset.demoRole;
      isRegisterMode = false;
      const emailEl = document.getElementById("emailInput");
      if (emailEl) emailEl.value = chip.dataset.demoEmail;
      updateAuthUI();
      authForm.requestSubmit();
    });
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById("emailInput");
    const email = emailEl ? emailEl.value.trim() : "user@zilomarket.in";

    if (isRegisterMode && selectedRole === "business") {
      const shopNameEl = document.getElementById("shopName");
      const shopCategoryEl = document.getElementById("shopCategory");
      const shopDistanceEl = document.getElementById("shopDistance");
      const featuredItemEl = document.getElementById("featuredItem");
      const startingPriceEl = document.getElementById("startingPrice");
      const shopLocationEl = document.getElementById("shopLocation");

      const shopName = (shopNameEl && shopNameEl.value.trim()) || "New Local Business";
      const shopCategory = (shopCategoryEl && shopCategoryEl.value) || "Manufacturing & Disposables";
      const shopDistance = (shopDistanceEl && parseFloat(shopDistanceEl.value)) || 3.5;
      const featuredItem = (featuredItemEl && featuredItemEl.value.trim()) || "Wholesale Supply";
      const startingPrice = (startingPriceEl && parseFloat(startingPriceEl.value)) || 99;
      const shopLocation = (shopLocationEl && shopLocationEl.value.trim()) || "Within 30km Zone";

      const newShop = {
        id: "shop-" + Date.now(),
        name: shopName,
        category: shopCategory,
        distance: shopDistance,
        featuredItem: featuredItem,
        startingPrice: startingPrice,
        unit: "direct rate",
        location: shopLocation,
        phone: "919800000000",
        verified: true,
        products: [
          {
            id: "prod-" + Date.now(),
            name: featuredItem,
            price: startingPrice,
            mrp: Math.round(startingPrice * 1.25),
            unit: "standard unit",
            moq: "1 unit"
          }
        ]
      };

      const shops = getShops();
      shops.unshift(newShop);
      saveShops(shops);
      await initCloudDB();
      await saveShopToCloud(newShop);
    }

    localStorage.setItem("zilo_user", JSON.stringify({ email, role: selectedRole }));

    const targetPage = selectedRole === "user" ? "index.html" : "dashboard.html";
    if (authMessage) {
      authMessage.style.color = "#059669";
      authMessage.textContent = `✔ Authenticated as ${selectedRole.toUpperCase()}! Launching workspace...`;
    }

    setTimeout(() => {
      window.location.href = targetPage;
    }, 400);
  });

  requestAnimationFrame(() => updateAuthUI());
}

// ============================================================================
// 3. ROLE-BASED DASHBOARD + LINE SIDEBAR SWITCHER (dashboard.html)
// ============================================================================
const vendorWorkspace = document.getElementById("vendorWorkspace");
const adminWorkspace = document.getElementById("adminWorkspace");

if (vendorWorkspace || adminWorkspace) {
  const user = getCurrentUser() || { email: "partner@zilomarket.in", role: "business" };
  const dashRoleBanner = document.getElementById("dashRoleBanner");
  const dashSubTag = document.getElementById("dashSubTag");
  const dashLogoutBtn = document.getElementById("dashLogoutBtn");
  const navBtnVendor = document.getElementById("navBtnVendor");
  const navBtnAdmin = document.getElementById("navBtnAdmin");

  if (dashRoleBanner) dashRoleBanner.innerHTML = `Signed in as <strong>${user.email}</strong> (${user.role.toUpperCase()} PORTAL)`;
  if (dashSubTag) dashSubTag.textContent = `${user.role.toUpperCase()} WORKSPACE`;

  if (dashLogoutBtn) {
    dashLogoutBtn.addEventListener("click", () => {
      localStorage.removeItem("zilo_user");
      window.location.href = "login.html";
    });
  }

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

  if (user.role === "admin" || user.role === "team") {
    switchDashboardTab("admin");
  } else {
    switchDashboardTab("vendor");
  }

  initLineSidebar("dashLineNav", "dashLineIndicator", (clickedBtn) => {
    if (clickedBtn.dataset.view) {
      switchDashboardTab(clickedBtn.dataset.view);
    }
  });

  const vendorShopSelect = document.getElementById("vendorShopSelect");
  const vendorCatalogList = document.getElementById("vendorCatalogList");
  const addProductForm = document.getElementById("addProductForm");

  function loadVendorShops() {
    if (!vendorShopSelect) return;
    const shops = getShops();
    vendorShopSelect.innerHTML = shops.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    renderVendorProducts();
  }

  function renderVendorProducts() {
    if (!vendorCatalogList || !vendorShopSelect) return;
    const shops = getShops();
    const selectedShop = shops.find(s => s.id === vendorShopSelect.value) || shops[0];
    if (!selectedShop) return;

    const products = selectedShop.products || [];
    vendorCatalogList.innerHTML = products.map(p => `
      <div class="catalog-item">
        <div>
          <div class="catalog-item-title">${p.name}</div>
          <div class="catalog-item-moq">Unit: ${p.unit} • MOQ: ${p.moq}</div>
        </div>
        <div class="catalog-item-pricing">
          <span class="catalog-sasta-price">₹${p.price}</span>
          <span class="catalog-mrp">₹${p.mrp}</span>
        </div>
      </div>
    `).join("");
  }

  if (vendorShopSelect) vendorShopSelect.addEventListener("change", renderVendorProducts);

  if (addProductForm) {
    addProductForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const shops = getShops();
      const shopIndex = shops.findIndex(s => s.id === vendorShopSelect.value);
      if (shopIndex === -1) return;

      const newProd = {
        id: "prod-" + Date.now(),
        name: document.getElementById("prodName").value.trim(),
        price: parseFloat(document.getElementById("prodPrice").value),
        mrp: parseFloat(document.getElementById("prodMrp").value),
        unit: document.getElementById("prodUnit").value.trim(),
        moq: document.getElementById("prodMoq").value.trim()
      };

      if (!shops[shopIndex].products) shops[shopIndex].products = [];
      shops[shopIndex].products.unshift(newProd);

      if (newProd.price < shops[shopIndex].startingPrice) {
        shops[shopIndex].startingPrice = newProd.price;
        shops[shopIndex].featuredItem = newProd.name;
      }

      saveShops(shops);
      await initCloudDB();
      await saveShopToCloud(shops[shopIndex]);

      addProductForm.reset();
      renderVendorProducts();
      renderAdminTable();
      alert("Product added to 30km catalog!");
    });
  }

  const adminShopTableBody = document.getElementById("adminShopTableBody");

  window.toggleVerifyShop = async function(shopId) {
    const shops = getShops();
    const target = shops.find(s => s.id === shopId);
    if (target) {
      target.verified = !target.verified;
      saveShops(shops);
      await initCloudDB();
      await saveShopToCloud(target);
      renderAdminTable();
    }
  };

  window.deleteShopListing = async function(shopId) {
    if (!confirm("Remove this shop from the 30km marketplace?")) return;
    const shops = getShops().filter(s => s.id !== shopId);
    saveShops(shops);
    await initCloudDB();
    await deleteShopFromCloud(shopId);
    renderAdminTable();
    loadVendorShops();
  };

  function renderAdminTable() {
    if (!adminShopTableBody) return;
    const shops = getShops();
    adminShopTableBody.innerHTML = shops.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.category}</td>
        <td class="mono-text">${s.distance} km</td>
        <td class="mono-text">₹${s.startingPrice} (${s.featuredItem})</td>
        <td>
          <span class="status-badge ${s.verified ? 'verified' : 'pending'}">
            ${s.verified ? '✔ Verified' : 'Pending'}
          </span>
        </td>
        <td style="display:flex; gap:8px;">
          <button class="btn btn-outline" style="padding:5px 10px; font-size:12px;" onclick="toggleVerifyShop('${s.id}')">
            ${s.verified ? 'Unverify' : 'Approve ✔'}
          </button>
          <button class="btn btn-outline" style="padding:5px 10px; font-size:12px; color:#DC2626;" onclick="deleteShopListing('${s.id}')">
            Delete
          </button>
        </td>
      </tr>
    `).join("");
  }

  loadVendorShops();
  renderAdminTable();
}

