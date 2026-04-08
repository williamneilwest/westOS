from datetime import datetime

from ..db import db


class HomePlanningProfile(db.Model):
    __tablename__ = 'home_planning_profiles'

    id = db.Column(db.String(64), primary_key=True, default='default')
    current_savings = db.Column(db.Float, nullable=False, default=18000)
    monthly_savings = db.Column(db.Float, nullable=False, default=900)
    target_home_price = db.Column(db.Float, nullable=False, default=425000)
    down_payment_percent = db.Column(db.Float, nullable=False, default=10)
    interest_rate = db.Column(db.Float, nullable=False, default=6.5)
    monthly_income = db.Column(db.Float, nullable=False, default=5500)
    monthly_expenses = db.Column(db.Float, nullable=False, default=2600)
    loan_term_years = db.Column(db.Integer, nullable=False, default=30)
    property_tax_rate = db.Column(db.Float, nullable=False, default=0.65)
    insurance_monthly = db.Column(db.Float, nullable=False, default=160)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'currentSavings': self.current_savings,
            'monthlySavings': self.monthly_savings,
            'targetHomePrice': self.target_home_price,
            'downPaymentPercent': self.down_payment_percent,
            'interestRate': self.interest_rate,
            'monthlyIncome': self.monthly_income,
            'monthlyExpenses': self.monthly_expenses,
            'loanTermYears': self.loan_term_years,
            'propertyTaxRate': self.property_tax_rate,
            'insuranceMonthly': self.insurance_monthly,
        }
