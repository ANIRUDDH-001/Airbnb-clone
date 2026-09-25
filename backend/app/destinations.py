"""The destinations the demo covers: used for 'Where' suggestions, the host form's location helper and the seed."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Destination:
    name: str
    state: str
    country: str
    latitude: float
    longitude: float
    blurb: str


DESTINATIONS: tuple[Destination, ...] = (
    Destination("Goa", "Goa", "India", 15.4909, 73.8278, "Beaches, shacks and Portuguese villas"),
    Destination("Manali", "Himachal Pradesh", "India", 32.2432, 77.1892, "Snow peaks and pine forests"),
    Destination("Jaipur", "Rajasthan", "India", 26.9124, 75.7873, "Forts, havelis and bazaars"),
    Destination("Udaipur", "Rajasthan", "India", 24.5854, 73.7125, "Lakes and palaces"),
    Destination("Mumbai", "Maharashtra", "India", 19.0760, 72.8777, "For sights like Marine Drive"),
    Destination("Bengaluru", "Karnataka", "India", 12.9716, 77.5946, "Gardens, cafés and craft beer"),
    Destination("Alleppey", "Kerala", "India", 9.4981, 76.3388, "Backwaters and houseboats"),
    Destination("Munnar", "Kerala", "India", 10.0889, 77.0595, "Tea estates in the clouds"),
    Destination("Rishikesh", "Uttarakhand", "India", 30.0869, 78.2676, "Yoga, rafting and the Ganges"),
    Destination("Coorg", "Karnataka", "India", 12.3375, 75.8069, "Coffee plantations and waterfalls"),
    Destination("Puducherry", "Puducherry", "India", 11.9416, 79.8083, "French Quarter and seaside promenades"),
    Destination("Shimla", "Himachal Pradesh", "India", 31.1048, 77.1734, "Colonial hill-station charm"),
)
