from flask import Blueprint, current_app, request

from ..api_response import success_response
from ..db import db
from ..models import HomePlanningProfile, HomePlanningScenario


home_planning_bp = Blueprint('home_planning', __name__)


@home_planning_bp.get('/home-planning/', strict_slashes=False)
def get_home_planning_profile():
    current_app.logger.info('[DB] Fetching table: home_planning_profiles')
    profile = HomePlanningProfile.query.get('default')
    if not profile:
        profile = HomePlanningProfile(id='default')
        db.session.add(profile)
        db.session.commit()

    return success_response(profile.to_dict())


@home_planning_bp.post('/home-planning/', strict_slashes=False)
def update_home_planning_profile():
    data = request.get_json(silent=True) or {}
    profile = HomePlanningProfile.query.get('default')

    if not profile:
        profile = HomePlanningProfile(id='default')
        db.session.add(profile)

    profile.current_savings = float(data.get('currentSavings', profile.current_savings))
    profile.monthly_savings = float(data.get('monthlySavings', profile.monthly_savings))
    profile.target_home_price = float(data.get('targetHomePrice', profile.target_home_price))
    profile.down_payment_percent = float(data.get('downPaymentPercent', profile.down_payment_percent))
    profile.interest_rate = float(data.get('interestRate', profile.interest_rate))
    profile.monthly_income = float(data.get('monthlyIncome', profile.monthly_income))
    profile.monthly_expenses = float(data.get('monthlyExpenses', profile.monthly_expenses))
    profile.loan_term_years = int(data.get('loanTermYears', profile.loan_term_years))
    profile.property_tax_rate = float(data.get('propertyTaxRate', profile.property_tax_rate))
    profile.insurance_monthly = float(data.get('insuranceMonthly', profile.insurance_monthly))

    db.session.commit()
    return success_response(profile.to_dict())


@home_planning_bp.get('/home-planning/scenarios', strict_slashes=False)
def get_home_planning_scenarios():
    current_app.logger.info('[DB] Fetching table: home_planning_scenarios')
    scenarios = HomePlanningScenario.query.order_by(HomePlanningScenario.multiplier.asc()).all()
    return success_response({'data': [scenario.to_dict() for scenario in scenarios]})
