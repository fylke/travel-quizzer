"""Seed the database with sample travel destinations.

Usage:
    uv run python -m scripts.seed_db

Or inside the container:
    podman exec travel-quizzer python -m scripts.seed_db
"""

import sys
import os

# Ensure the project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from werkzeug.security import generate_password_hash

from backend import app
from backend.models import db, Destination, User

DESTINATIONS = [
    {
        "name": "Paris",
        "hint1": "This city hosts the world's most visited museum.",
        "hint2": "A famous iron tower was built here for a world's fair in 1889.",
        "hint3": "It's known as the City of Light.",
        "hint4": "The Seine river flows through it.",
        "hint5": "It is the capital of France.",
        "images": [
            "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600",
            "https://images.unsplash.com/photo-1549144511-f099e773c147?w=600",
        ],
        "correct_answers": ["paris", "paris france", "paris, france"],
    },
    {
        "name": "Tokyo",
        "hint1": "This city has the busiest pedestrian crossing in the world.",
        "hint2": "It hosted the Summer Olympics in 2020 (held 2021).",
        "hint3": "Famous for its cherry blossoms in spring.",
        "hint4": "Home to the Shibuya and Shinjuku districts.",
        "hint5": "It is the capital of Japan.",
        "images": [
            "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600",
            "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600",
        ],
        "correct_answers": ["tokyo", "tokyo japan", "tokyo, japan"],
    },
    {
        "name": "New York City",
        "hint1": "This city's subway system has 472 stations.",
        "hint2": "A famous green statue greets visitors arriving by sea.",
        "hint3": "Known as the city that never sleeps.",
        "hint4": "Home to a large park in the middle of Manhattan.",
        "hint5": "Often called the Big Apple.",
        "images": [
            "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600",
            "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600",
        ],
        "correct_answers": ["new york", "new york city", "nyc"],
    },
    {
        "name": "Rome",
        "hint1": "This city contains an independent country within its borders.",
        "hint2": "An ancient amphitheater that held 50,000 spectators still stands here.",
        "hint3": "Legend says throwing a coin in a fountain guarantees your return.",
        "hint4": "Known as the Eternal City.",
        "hint5": "It is the capital of Italy.",
        "images": [
            "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600",
            "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=600",
        ],
        "correct_answers": ["rome", "roma", "rome italy", "rome, italy"],
    },
    {
        "name": "Sydney",
        "hint1": "This city's harbour bridge is nicknamed 'the Coathanger'.",
        "hint2": "Home to a world-famous opera house with sail-shaped roofs.",
        "hint3": "Its most popular beach shares its name with a famous lifeguard TV show.",
        "hint4": "Located on Australia's east coast.",
        "hint5": "The largest city in Australia (but not the capital).",
        "images": [
            "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600",
            "https://images.unsplash.com/photo-1524293581917-878a6d017c71?w=600",
        ],
        "correct_answers": ["sydney", "sydney australia", "sydney, australia"],
    },
]


def seed():
    with app.app_context():
        db.create_all()

        # Seed admin user
        admin_email = "admin@travel-quizzer.local"
        admin_password = "admin123"
        if User.query.filter_by(email=admin_email).first():
            print(f"  Admin user '{admin_email}' already exists.")
        else:
            admin = User(
                name="Admin",
                email=admin_email,
                password_hash=generate_password_hash(admin_password),
                is_admin=True,
            )
            db.session.add(admin)
            db.session.commit()
            print(f"  Created admin user: {admin_email} / {admin_password}")

        existing = Destination.query.count()
        if existing > 0:
            print(f"Database already has {existing} destination(s). Skipping seed.")
            print("Use --force to seed anyway (existing data will be kept).")
            if "--force" not in sys.argv:
                return

        added = 0
        for dest_data in DESTINATIONS:
            # Skip if a destination with the same name already exists
            if Destination.query.filter_by(name=dest_data["name"]).first():
                print(f"  Skipping '{dest_data['name']}' (already exists)")
                continue

            dest = Destination(
                name=dest_data["name"],
                hint1=dest_data["hint1"],
                hint2=dest_data["hint2"],
                hint3=dest_data["hint3"],
                hint4=dest_data["hint4"],
                hint5=dest_data["hint5"],
                images=dest_data["images"],
                correct_answers=dest_data["correct_answers"],
            )
            db.session.add(dest)
            added += 1

        db.session.commit()
        print(f"Seeded {added} destination(s). Total now: {Destination.query.count()}")


if __name__ == "__main__":
    seed()
