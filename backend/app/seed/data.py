"""Static demo content. Everything random is derived from these tables with a fixed seed in run.py."""

from dataclasses import dataclass

DEMO_GUEST_EMAIL = "ananya@example.com"
DEMO_HOST_EMAIL = "rahul@example.com"

# (code, name, icon, group)
AMENITIES = [
    ("wifi", "Wifi", "wifi", "Essentials"), ("kitchen", "Kitchen", "cooking-pot", "Essentials"),
    ("washer", "Washing machine", "washing-machine", "Essentials"),
    ("air_conditioning", "Air conditioning", "air-vent", "Essentials"), ("heating", "Heating", "heater", "Essentials"),
    ("dedicated_workspace", "Dedicated workspace", "laptop", "Essentials"), ("tv", "TV", "tv", "Essentials"),
    ("hair_dryer", "Hair dryer", "wind", "Essentials"), ("iron", "Iron", "shirt", "Essentials"),
    ("hot_water", "Hot water", "droplets", "Essentials"), ("self_check_in", "Self check-in", "key-round", "Essentials"),
    ("pool", "Pool", "waves", "Features"), ("hot_tub", "Hot tub", "bath", "Features"),
    ("free_parking", "Free parking on premises", "car", "Features"), ("ev_charger", "EV charger", "plug-zap", "Features"),
    ("gym", "Gym", "dumbbell", "Features"), ("bbq_grill", "BBQ grill", "flame", "Features"),
    ("breakfast", "Breakfast", "coffee", "Features"), ("indoor_fireplace", "Indoor fireplace", "flame-kindling", "Features"),
    ("beach_access", "Beach access", "umbrella", "Location"), ("waterfront", "Waterfront", "sailboat", "Location"),
    ("mountain_view", "Mountain view", "mountain", "Location"),
    ("smoke_alarm", "Smoke alarm", "alarm-smoke", "Safety"), ("first_aid_kit", "First aid kit", "briefcase-medical", "Safety"),
    ("fire_extinguisher", "Fire extinguisher", "fire-extinguisher", "Safety"),
]
ALWAYS_AMENITIES = ["wifi", "hot_water", "smoke_alarm"]
OPTIONAL_AMENITIES = ["kitchen", "washer", "air_conditioning", "dedicated_workspace", "tv", "hair_dryer", "iron",
                      "self_check_in", "free_parking", "bbq_grill", "breakfast", "first_aid_kit", "fire_extinguisher"]
THEME_AMENITIES = {
    "beach": ["beach_access", "air_conditioning"], "mountain": ["heating", "mountain_view", "indoor_fireplace"],
    "heritage": ["air_conditioning", "breakfast"], "lake": ["waterfront"], "city": ["air_conditioning", "gym"],
    "countryside": ["free_parking", "bbq_grill"],
}

# (slug, name, icon) — order = position in the category bar
CATEGORIES = [
    ("amazing_views", "Amazing views", "mountain-snow"), ("beachfront", "Beachfront", "umbrella"),
    ("amazing_pools", "Amazing pools", "waves"), ("cabins", "Cabins", "tent-tree"),
    ("trending", "Trending", "flame"), ("countryside", "Countryside", "trees"), ("farms", "Farms", "tractor"),
    ("tiny_homes", "Tiny homes", "house"), ("lakefront", "Lakefront", "sailboat"), ("mansions", "Mansions", "castle"),
    ("historical_homes", "Historical homes", "landmark"), ("tropical", "Tropical", "tree-palm"),
    ("top_cities", "Top cities", "building-2"), ("houseboats", "Houseboats", "ship"),
]

# (name, email, is_superhost, avatar, bio, years hosting)
HOSTS = [
    ("Rahul Mehta", DEMO_HOST_EMAIL, True, "https://randomuser.me/api/portraits/men/32.jpg",
     "Architect turned host. I restore old homes across India and love sharing them.", 6),
    ("Priya Nair", "priya@example.com", True, "https://randomuser.me/api/portraits/women/44.jpg",
     "Kochi native who loves the backwaters and strong filter coffee.", 5),
    ("Arjun Singh", "arjun@example.com", False, "https://randomuser.me/api/portraits/men/51.jpg",
     "Mountain guide and weekend baker.", 3),
    ("Meera Iyer", "meera@example.com", False, "https://randomuser.me/api/portraits/women/65.jpg",
     "Heritage conservationist and chai enthusiast.", 4),
    ("Kabir Khan", "kabir@example.com", False, "https://randomuser.me/api/portraits/men/76.jpg",
     "Photographer. Happy to share my favourite local spots.", 2),
    ("Sofia D'Souza", "sofia@example.com", False, "https://randomuser.me/api/portraits/women/12.jpg",
     "Goan at heart. Ask me about the best beach shacks.", 3),
]

# (name, email, avatar)
GUESTS = [
    ("Ananya Sharma", DEMO_GUEST_EMAIL, "https://randomuser.me/api/portraits/women/68.jpg"),
    ("Vikram Rao", "vikram@example.com", "https://randomuser.me/api/portraits/men/41.jpg"),
    ("Neha Gupta", "neha@example.com", "https://randomuser.me/api/portraits/women/22.jpg"),
    ("Rohan Das", "rohan@example.com", "https://randomuser.me/api/portraits/men/15.jpg"),
    ("Isha Kapoor", "isha@example.com", "https://randomuser.me/api/portraits/women/33.jpg"),
    ("Aditya Verma", "aditya@example.com", "https://randomuser.me/api/portraits/men/85.jpg"),
    ("Zoya Ali", "zoya@example.com", "https://randomuser.me/api/portraits/women/90.jpg"),
    ("Karan Malhotra", "karan@example.com", "https://randomuser.me/api/portraits/men/64.jpg"),
]

DESTINATION_THEMES = {
    "Goa": "beach", "Manali": "mountain", "Jaipur": "heritage", "Udaipur": "lake", "Mumbai": "city",
    "Bengaluru": "city", "Alleppey": "lake", "Munnar": "countryside", "Rishikesh": "mountain",
    "Coorg": "countryside", "Puducherry": "beach", "Shimla": "mountain",
}


@dataclass(frozen=True)
class Blueprint:
    destination: str
    city: str
    title: str
    property_type: str
    room_type: str
    nightly_price: int
    cleaning_fee: int
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: int
    categories: tuple[str, ...]


B = Blueprint
LISTINGS = [
    B("Goa", "Assagao", "Sunlit Portuguese villa with private pool", "villa", "entire_home", 14500, 2500, 8, 4, 5, 4, ("amazing_pools", "tropical", "mansions")),
    B("Goa", "Palolem", "Palolem beach hut steps from the sand", "cabin", "entire_home", 3200, 500, 2, 1, 1, 1, ("beachfront", "tropical")),
    B("Goa", "Candolim", "Candolim sea-view flat with balcony", "flat", "entire_home", 4800, 800, 4, 2, 2, 2, ("amazing_views", "beachfront")),
    B("Goa", "Anjuna", "Anjuna tiny home under the cashew trees", "tiny_home", "entire_home", 2600, 400, 2, 1, 1, 1, ("tiny_homes", "trending")),
    B("Manali", "Old Manali", "Cedar-wood cabin with snow-peak views", "cabin", "entire_home", 5200, 900, 4, 2, 2, 1, ("cabins", "amazing_views")),
    B("Manali", "Vashisht", "Apple-orchard cottage in Vashisht", "cottage", "entire_home", 3900, 600, 5, 2, 3, 2, ("farms", "countryside")),
    B("Manali", "Manali", "Cosy room in a Himachali homestay", "guest_house", "private_room", 1600, 200, 2, 1, 1, 1, ("countryside",)),
    B("Manali", "Solang", "Solang valley chalet with fireplace", "house", "entire_home", 8800, 1500, 6, 3, 4, 3, ("cabins", "trending")),
    B("Jaipur", "Jaipur", "Royal haveli suite near Hawa Mahal", "guest_house", "private_room", 4200, 500, 2, 1, 1, 1, ("historical_homes", "top_cities")),
    B("Jaipur", "Jaipur", "Pink City courtyard home with rooftop", "house", "entire_home", 7600, 1200, 6, 3, 3, 3, ("historical_homes", "trending")),
    B("Jaipur", "Jaipur", "Boutique heritage hotel room near Amer Fort", "hotel", "private_room", 5400, 0, 2, 1, 1, 1, ("historical_homes",)),
    B("Jaipur", "Jaipur", "Modern flat in C-Scheme", "flat", "entire_home", 3100, 500, 3, 1, 2, 1, ("top_cities",)),
    B("Udaipur", "Udaipur", "Lake Pichola view heritage room", "hotel", "private_room", 6200, 0, 2, 1, 1, 1, ("lakefront", "historical_homes")),
    B("Udaipur", "Udaipur", "Palace-style villa with lake terrace", "villa", "entire_home", 18500, 3000, 10, 5, 6, 5, ("mansions", "lakefront", "amazing_pools")),
    B("Udaipur", "Udaipur", "Old City artist's flat", "flat", "entire_home", 2900, 400, 3, 1, 2, 1, ("trending",)),
    B("Udaipur", "Udaipur", "Aravalli hills farm stay", "farm_stay", "entire_home", 4600, 700, 6, 3, 3, 2, ("farms", "countryside")),
    B("Mumbai", "Mumbai", "Sea-facing flat on Marine Drive", "flat", "entire_home", 9800, 1500, 4, 2, 2, 2, ("amazing_views", "top_cities")),
    B("Mumbai", "Mumbai", "Bandra loft near Carter Road", "flat", "entire_home", 6900, 1000, 3, 1, 2, 1, ("top_cities", "trending")),
    B("Mumbai", "Mumbai", "Colaba heritage guest room", "guest_house", "private_room", 3400, 300, 2, 1, 1, 1, ("historical_homes", "top_cities")),
    B("Mumbai", "Mumbai", "Juhu beach bungalow with garden", "house", "entire_home", 15500, 2500, 8, 4, 4, 4, ("beachfront", "mansions")),
    B("Bengaluru", "Bengaluru", "Indiranagar studio with workspace", "flat", "entire_home", 2800, 400, 2, 1, 1, 1, ("top_cities",)),
    B("Bengaluru", "Bengaluru", "Garden cottage in Whitefield", "cottage", "entire_home", 3600, 600, 4, 2, 2, 2, ("countryside",)),
    B("Bengaluru", "Bengaluru", "Koramangala room in a designer home", "house", "private_room", 1900, 200, 2, 1, 1, 1, ("trending", "top_cities")),
    B("Bengaluru", "Bengaluru", "Nandi Hills view farmhouse", "farm_stay", "entire_home", 7200, 1200, 8, 4, 5, 3, ("farms", "amazing_views")),
    B("Alleppey", "Alleppey", "Private houseboat on Vembanad Lake", "houseboat", "entire_home", 9500, 1000, 4, 2, 2, 2, ("houseboats", "lakefront")),
    B("Alleppey", "Alleppey", "Backwater-front villa with canoe", "villa", "entire_home", 8400, 1200, 6, 3, 3, 3, ("lakefront", "tropical")),
    B("Alleppey", "Alleppey", "Paddy-field homestay room", "guest_house", "private_room", 1800, 200, 2, 1, 1, 1, ("countryside", "tropical")),
    B("Alleppey", "Alleppey", "Coconut-grove cottage by the canal", "cottage", "entire_home", 3300, 500, 3, 1, 2, 1, ("tropical", "lakefront")),
    B("Munnar", "Munnar", "Tea-estate bungalow in the clouds", "house", "entire_home", 11200, 1800, 8, 4, 4, 4, ("amazing_views", "farms")),
    B("Munnar", "Munnar", "Treetop cabin above the tea gardens", "cabin", "entire_home", 4700, 700, 2, 1, 1, 1, ("cabins", "amazing_views")),
    B("Munnar", "Munnar", "Misty valley cottage", "cottage", "entire_home", 3500, 500, 4, 2, 2, 1, ("countryside",)),
    B("Munnar", "Munnar", "Planter's guest room with valley view", "guest_house", "private_room", 2100, 200, 2, 1, 1, 1, ("historical_homes", "countryside")),
    B("Rishikesh", "Rishikesh", "Riverside cottage near Laxman Jhula", "cottage", "entire_home", 3800, 500, 4, 2, 2, 1, ("lakefront", "trending")),
    B("Rishikesh", "Rishikesh", "Yoga retreat room with Ganges view", "guest_house", "private_room", 1700, 0, 2, 1, 1, 1, ("amazing_views",)),
    B("Rishikesh", "Rishikesh", "Forest cabin in Tapovan", "cabin", "entire_home", 2900, 400, 3, 1, 2, 1, ("cabins", "countryside")),
    B("Rishikesh", "Rishikesh", "Boutique hotel suite in Tapovan", "hotel", "private_room", 4400, 0, 2, 1, 1, 1, ("trending",)),
    B("Coorg", "Coorg", "Coffee-plantation estate villa", "villa", "entire_home", 13500, 2000, 10, 5, 6, 5, ("farms", "mansions", "amazing_pools")),
    B("Coorg", "Coorg", "Waterfall-view cottage near Madikeri", "cottage", "entire_home", 4100, 600, 4, 2, 2, 2, ("amazing_views", "countryside")),
    B("Coorg", "Coorg", "Plantation homestay room", "guest_house", "private_room", 2300, 200, 2, 1, 1, 1, ("farms",)),
    B("Coorg", "Coorg", "A-frame tiny home in the coffee hills", "tiny_home", "entire_home", 3700, 500, 2, 1, 1, 1, ("tiny_homes", "trending")),
    B("Puducherry", "Puducherry", "French Quarter heritage villa", "villa", "entire_home", 9200, 1500, 6, 3, 3, 3, ("historical_homes", "amazing_pools")),
    B("Puducherry", "Puducherry", "Promenade sea-view flat", "flat", "entire_home", 4300, 600, 4, 2, 2, 2, ("beachfront", "amazing_views")),
    B("Puducherry", "Puducherry", "Auroville eco tiny home", "tiny_home", "entire_home", 2400, 300, 2, 1, 1, 1, ("tiny_homes", "countryside")),
    B("Puducherry", "Puducherry", "Tamil Quarter courtyard room", "guest_house", "private_room", 1900, 200, 2, 1, 1, 1, ("historical_homes",)),
    B("Shimla", "Shimla", "Colonial cottage on the Ridge", "cottage", "entire_home", 5600, 800, 4, 2, 2, 2, ("historical_homes", "amazing_views")),
    B("Shimla", "Shimla", "Pine-forest cabin in Mashobra", "cabin", "entire_home", 4900, 700, 4, 2, 3, 1, ("cabins", "countryside")),
    B("Shimla", "Shimla", "Mall Road view flat", "flat", "entire_home", 3200, 500, 3, 1, 2, 1, ("top_cities",)),
    B("Shimla", "Shimla", "Snow-view hotel room in Kufri", "hotel", "private_room", 3900, 0, 2, 1, 1, 1, ("amazing_views",)),
]
DEMO_HOST_LISTING_INDEXES = (0, 4, 8, 12, 16, 24, 28, 40)  # Rahul's 8 listings, one per region

REVIEW_COMMENTS = [
    "{host} was a wonderful host and the place was spotless. {city} was magical.",
    "Exactly as pictured. Great location for exploring {city}.",
    "Beautiful home, very comfortable beds and a super quick check-in.",
    "We loved every minute. {host} gave us great local tips.",
    "Peaceful, clean and thoughtfully designed. Would stay again.",
    "Perfect base for a long weekend in {city}. Highly recommend.",
    "The views are even better in person. Thank you {host}!",
    "Spacious, well equipped and in a quiet neighbourhood.",
    "Good value for money and {host} responded within minutes.",
    "A little tricky to find at night, but the stay itself was lovely.",
    "Cosy and charming, with everything we needed for a relaxed trip.",
    "Our favourite stay of the whole trip to {city}.",
]
