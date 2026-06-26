"""Admin blueprint — destination CRUD endpoints."""

from flask import Blueprint, jsonify, request

from .admin import normalize_answers, validate_destination_payload
from .auth import admin_required, csrf_protected
from .models import Destination, db

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/api/admin/destinations", methods=["GET"])
@admin_required
def list_destinations():
    """Return all destinations ordered by ID ascending."""
    destinations = Destination.query.order_by(Destination.id.asc()).all()
    result = [{"id": d.id, "name": d.name} for d in destinations]
    return jsonify({"destinations": result, "count": len(result)})


@admin_bp.route("/api/admin/destinations/<int:destination_id>", methods=["GET"])
@admin_required
def get_destination(destination_id):
    """Return full destination data by ID."""
    destination = db.session.get(Destination, destination_id)
    if not destination:
        return jsonify({"error": "Destination not found"}), 404
    return jsonify(
        {
            "id": destination.id,
            "name": destination.name,
            "hints": [
                destination.hint1,
                destination.hint2,
                destination.hint3,
                destination.hint4,
                destination.hint5,
            ],
            "correct_answers": destination.correct_answers,
        }
    )


@admin_bp.route("/api/admin/destinations", methods=["POST"])
@admin_required
@csrf_protected
def create_destination():
    """Create a new destination."""
    data = request.json or {}

    is_valid, errors = validate_destination_payload(data)
    if not is_valid:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    # Check for duplicate name (case-sensitive exact match)
    existing = Destination.query.filter_by(name=data["name"]).first()
    if existing:
        return jsonify({"error": "A destination with this name already exists"}), 409

    # Store hints as hint1–hint5 columns
    hints = data["hints"]
    normalized = normalize_answers(data["correct_answers"])

    destination = Destination(
        name=data["name"],
        hint1=hints[0],
        hint2=hints[1],
        hint3=hints[2],
        hint4=hints[3],
        hint5=hints[4],
        correct_answers=normalized,
    )
    db.session.add(destination)
    db.session.commit()

    return jsonify({"id": destination.id}), 201


@admin_bp.route("/api/admin/destinations/<int:destination_id>", methods=["DELETE"])
@admin_required
@csrf_protected
def delete_destination(destination_id):
    """Delete a destination and cascade to associated quiz results."""
    destination = db.session.get(Destination, destination_id)
    if not destination:
        return jsonify({"error": "Destination not found"}), 404
    db.session.delete(destination)
    db.session.commit()
    return jsonify({"message": "Destination deleted"}), 200


@admin_bp.route("/api/admin/destinations/<int:destination_id>", methods=["PUT"])
@admin_required
@csrf_protected
def update_destination(destination_id):
    """Update (replace) all fields of an existing destination."""
    destination = db.session.get(Destination, destination_id)
    if not destination:
        return jsonify({"error": "Destination not found"}), 404

    data = request.json or {}

    is_valid, errors = validate_destination_payload(data)
    if not is_valid:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    # Replace all fields with submitted values
    hints = data["hints"]
    normalized = normalize_answers(data["correct_answers"])

    destination.name = data["name"]
    destination.hint1 = hints[0]
    destination.hint2 = hints[1]
    destination.hint3 = hints[2]
    destination.hint4 = hints[3]
    destination.hint5 = hints[4]
    destination.correct_answers = normalized

    db.session.commit()

    return jsonify(
        {
            "id": destination.id,
            "name": destination.name,
            "hints": [
                destination.hint1,
                destination.hint2,
                destination.hint3,
                destination.hint4,
                destination.hint5,
            ],
            "correct_answers": destination.correct_answers,
        }
    )
