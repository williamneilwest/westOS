from uuid import uuid4

from ..db import db


class HomePlanningScenario(db.Model):
    __tablename__ = 'home_planning_scenarios'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    label = db.Column(db.String(100), nullable=False)
    multiplier = db.Column(db.Float, nullable=False)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'label': self.label,
            'multiplier': self.multiplier,
        }
