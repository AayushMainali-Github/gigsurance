const PLATFORMS = ["blinkit", "zepto", "instamart", "zomato", "swiggy", "swish", "porter"];

const PLATFORM_GROUPS = {
  quickCommerce: new Set(["blinkit", "zepto", "instamart", "swish"]),
  food: new Set(["zomato", "swiggy"]),
  logistics: new Set(["porter"])
};

const PLATFORM_MIX_BY_TIER = {
  tier1: { blinkit: 0.18, zepto: 0.14, instamart: 0.14, zomato: 0.17, swiggy: 0.18, swish: 0.07, porter: 0.12 },
  tier2: { blinkit: 0.13, zepto: 0.08, instamart: 0.11, zomato: 0.2, swiggy: 0.22, swish: 0.03, porter: 0.23 },
  tier3: { blinkit: 0.08, zepto: 0.03, instamart: 0.08, zomato: 0.23, swiggy: 0.25, swish: 0.01, porter: 0.32 }
};

function isQuickCommerce(platformName) {
  return PLATFORM_GROUPS.quickCommerce.has(platformName);
}

function isFood(platformName) {
  return PLATFORM_GROUPS.food.has(platformName);
}

function isLogistics(platformName) {
  return PLATFORM_GROUPS.logistics.has(platformName);
}

module.exports = {
  PLATFORMS,
  PLATFORM_MIX_BY_TIER,
  PLATFORM_GROUPS,
  isQuickCommerce,
  isFood,
  isLogistics
};
