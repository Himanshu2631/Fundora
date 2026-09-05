"""
Synthetic MDCC Sample Generator
Generates a deterministic sample dataset adhering strictly to MDCC schema for testing pipelines.
"""

import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

CATEGORIES = ["Medical", "Memorial", "Emergency", "Financial", "Animal", "Education", "Community", "Family", "Events"]
COUNTRIES = ["US", "CA", "GB", "AU", "DE"]

SAMPLE_TITLES = [
    "Help John Battle Stage 4 Cancer",
    "Support Sarah's Emergency Surgery and Recovery",
    "Memorial Fund for Loving Mother of Three",
    "Help Rebuild Community Shelter After Fire",
    "College Tuition Assistance for Promising Scholar",
    "Veterinary Care Fund for Injured Rescue Dog",
    "Emergency Housing Support for Displaced Family",
    "Local Food Bank Holiday Relief Effort",
    "Help Mark Overcome Medical Debt After Accident",
    "Support Young Artist's First International Exhibition"
]

SAMPLE_DESCRIPTIONS = [
    "We are reaching out to ask for your generous support during an extraordinarily difficult time. John was recently diagnosed with stage 4 cancer and needs urgent specialized treatment.",
    "Sarah experienced a sudden medical crisis requiring emergency surgery. The medical bills and rehabilitation expenses are overwhelming for our family.",
    "In loving memory of our dearest mother who passed away suddenly. We are raising funds to cover funeral expenses and support her three young children.",
    "A tragic fire destroyed our local community shelter. We are asking for community support to rebuild the facility and provide shelter to those in need.",
    "As a first-generation college student working two part-time jobs, financial hardship threatens my ability to finish my senior year. Your donation will directly cover tuition."
]

def generate_sample_mdcc_dataset(n_samples: int = 500, seed: int = 42) -> List[Dict[str, Any]]:
    """
    Generates n_samples synthetic MDCC records matching exact schema & temporal sequences.
    Target distribution: ~45% successful (raised >= goal), ~55% underfunded (raised < goal).
    """
    rng = random.Random(seed)
    records = []
    base_date = datetime(2023, 1, 1, 10, 0, 0)

    for i in range(n_samples):
        cid = f"campaign_{i+1:05d}"
        cat = rng.choice(CATEGORIES)
        country = rng.choice(COUNTRIES)
        
        # Financial Goal ($500 to $50,000)
        goal = float(rng.choice([1000, 2500, 5000, 10000, 15000, 25000, 50000]))
        
        # Determine outcome: 45% success rate
        is_success = rng.random() < 0.45
        if is_success:
            raised = goal * rng.uniform(1.0, 1.8)
        else:
            raised = goal * rng.uniform(0.05, 0.92)
        raised = round(raised, 2)

        # Launch time (staggered over 180 days)
        launch_dt = base_date + timedelta(days=rng.randint(0, 180), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
        launch_str = launch_dt.isoformat()

        # Dynamic Events Generation (Donations, Updates, Comments)
        donations = []
        updates = []
        comments = []
        comment_cor_time = []

        # Total duration 30 days
        n_donations = rng.randint(5, 120) if is_success else rng.randint(1, 25)
        accumulated_amount = 0.0

        for d_idx in range(n_donations):
            # Donation timestamp relative to launch
            offset_hours = rng.uniform(0.5, 720.0) # Up to 30 days
            don_dt = launch_dt + timedelta(hours=offset_hours)
            
            # Amount
            don_amt = round(rng.uniform(10.0, 250.0), 2)
            accumulated_amount += don_amt
            
            donations.append({
                "time": don_dt.isoformat(),
                "amount": don_amt
            })

            # Donor comments (20% chance per donation)
            if rng.random() < 0.20:
                comment_dt = don_dt + timedelta(minutes=rng.randint(1, 30))
                comments.append({
                    "time": comment_dt.isoformat(),
                    "text": "Sending prayers and love!",
                })
                comment_cor_time.append(don_dt.isoformat())

        # Creator updates
        n_updates = rng.randint(1, 6) if is_success else rng.randint(0, 2)
        for u_idx in range(n_updates):
            upd_dt = launch_dt + timedelta(hours=rng.uniform(12.0, 600.0))
            updates.append({
                "time": upd_dt.isoformat(),
                "text": f"Update #{u_idx+1}: Thank you everyone for your support!"
            })

        # Image Metadata
        has_photo = rng.random() > 0.05
        cover_photo = f"{cid}_homepage.jpg" if has_photo else ""
        body_photos = [f"{cid}_description_1.jpg"] if rng.random() > 0.4 else []

        title = rng.choice(SAMPLE_TITLES) + f" #{i+1}"
        desc = rng.choice(SAMPLE_DESCRIPTIONS) + f" Please consider sharing this campaign with your network."

        record = {
            "campaign_id": cid,
            "title": title,
            "description": desc,
            "category": cat,
            "country": country,
            "goal": goal,
            "raised": raised,
            "launch_time": launch_str,
            "donations": donations,
            "updates": updates,
            "comments": comments,
            "comment_cor_time": comment_cor_time,
            "cover_photo": cover_photo,
            "body_photos": body_photos,
            "image_width": 1200 if has_photo else 0,
            "image_height": 800 if has_photo else 0,
        }
        records.append(record)

    return records
