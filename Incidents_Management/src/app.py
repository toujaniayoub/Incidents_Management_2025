import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import numpy as np
import warnings
from datetime import datetime, timedelta

warnings.filterwarnings('ignore') # Suppress warnings for cleaner console output

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing your Angular frontend to connect

# --- Database Connection Details ---
DB_HOST = "localhost"
DB_NAME = "DW_Telecom"
DB_USER = "postgres"
DB_PASS = "root"
DB_PORT = "5432"

# --- Global variables for ML Model and Encoders ---
model = None
encoders = {}

# Define feature columns upfront for consistency across functions
# Categorical features that need Label Encoding (SITE IS INCLUDED HERE FOR PREDICTION, ETC.):
CATEGORICAL_FEATURES = ['problem_type', 'service_name', 'priorite_name', 'site_name']
# Numerical features (year, month, day, hour):
NUMERICAL_FEATURES = ['open_year', 'open_month', 'open_day', 'open_hour']
# Combine all features for the model
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERICAL_FEATURES

# --- Database Connection Helper ---
def get_db_connection():
    """Establishes a new database connection."""
    return psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT)

# --- Model Loading and Training Function (Runs on app startup) ---
# THIS REMAINS UNCHANGED FROM ITS STATE *BEFORE* I MISUNDERSTOOD
def load_and_train_model():
    """
    Connects to the database, fetches data, preprocesses, and trains the ML model.
    This function is called once when the Flask app starts.
    """
    global model, encoders

    conn = None
    try:
        print("Attempting to connect to the database for model training...")
        conn = get_db_connection()
        print("Database connection successful for model training.")

        # SQL Query to fetch data for ML model training (SITE IS INCLUDED)
        sql_query = """
        SELECT
            dp.problem_type,
            ds.service_name,
            dpr.priorite_name,
            dsi.site_name, -- SITE IS INCLUDED HERE
            dd.year AS open_year,
            dd.month AS open_month,
            dd.day AS open_day,
            dd.hour AS open_hour,
            fi.time_to_resolve_minutes
        FROM
            "Fact_Incidents" fi
        JOIN
            "Dim_Problem" dp ON fi.problem_sk = dp.problem_sk
        JOIN
            "Dim_Service" ds ON fi.service_sk = ds.service_sk
        JOIN
            "Dim_Priorite" dpr ON fi.priorite_sk = dpr.priorite_sk
        JOIN
            "Dim_Site" dsi ON fi.site_sk = dsi.site_sk -- JOIN to Dim_Site IS INCLUDED
        JOIN
            "Dim_Date" dd ON fi.date_ouverture_sk = dd.date_sk
        WHERE
            fi.time_to_resolve_minutes IS NOT NULL
            AND fi.time_to_resolve_minutes > 0
            AND dp.problem_type IS NOT NULL AND dp.problem_type != ''
            AND ds.service_name IS NOT NULL AND ds.service_name != ''
            AND dpr.priorite_name IS NOT NULL AND dpr.priorite_name != ''
            AND dsi.site_name IS NOT NULL AND dsi.site_name != '' -- SITE CONDITION IS INCLUDED
            AND dd.year IS NOT NULL AND dd.month IS NOT NULL AND dd.day IS NOT NULL
            AND dd.hour IS NOT NULL;
        """
        df = pd.read_sql_query(sql_query, conn)
        print(f"Data loaded successfully for model training: {len(df)} rows.")

        df.dropna(inplace=True)
        print(f"Rows after dropping NaNs for model training: {len(df)}")

        # Normalize whitespace for categorical features
        for col in CATEGORICAL_FEATURES: # CATEGORICAL_FEATURES includes 'site_name'
            if col in df.columns and df[col].dtype == 'object':
                df[col] = df[col].astype(str).str.strip()
                print(f"Normalized whitespace for column: '{col}' for model training.")

        X = df[ALL_FEATURES]
        y = df['time_to_resolve_minutes']

        # Encode categorical features using LabelEncoder
        for col in CATEGORICAL_FEATURES:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col])
            encoders[col] = le # Store the fitted encoder
            print(f"Encoded '{col}' with {len(le.classes_)} unique values for model training.")

        # Ensure numerical features are correctly typed
        for col in NUMERICAL_FEATURES:
            X[col] = pd.to_numeric(X[col], errors='coerce')
        X.dropna(inplace=True) # Drop rows if numerical conversion failed
        y = y[X.index] # Align target with features after dropping rows

        # Split data for training
        X_train, _, y_train, _ = train_test_split(X, y, test_size=0.2, random_state=42)
        print(f"Training data size: {len(X_train)} samples.")

        # Train the RandomForestRegressor model
        print("Training the RandomForestRegressor model...")
        model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)
        print("Model training complete!")

    except Exception as e:
        print(f"Error during data loading or model training: {e}")
        model = None # Ensure model is None if training fails
        encoders = {}
    finally:
        if conn:
            conn.close()
            print("Database connection closed for model training.")

# --- Call model training on app startup ---
with app.app_context():
    load_and_train_model()

# --- API Endpoints ---

@app.route('/')
def home():
    """Basic home route to check if Flask server is running."""
    if model:
        return "Flask Backend for Incident Resolution Time Prediction is running and model is loaded!"
    else:
        return "Flask Backend is running, but model failed to load/train. Check server logs."

# THIS REMAINS UNCHANGED (SITE IS INCLUDED in dropdowns)
@app.route('/get_dropdown_data', methods=['GET'])
def get_dropdown_data():
    """Provides dynamic data for frontend dropdowns."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        dropdown_data = {}

        # Fetch and normalize problem types
        cursor.execute('SELECT DISTINCT problem_type FROM "Dim_Problem" WHERE problem_type IS NOT NULL AND problem_type != \'\';')
        problem_types_raw = [row[0] for row in cursor.fetchall()]
        dropdown_data['problemTypes'] = sorted(list(set([pt.strip() for pt in problem_types_raw])))

        # Fetch and normalize service names
        cursor.execute('SELECT DISTINCT service_name FROM "Dim_Service" WHERE service_name IS NOT NULL AND service_name != \'\';')
        service_names_raw = [row[0] for row in cursor.fetchall()]
        dropdown_data['serviceNames'] = sorted(list(set([sn.strip() for sn in service_names_raw])))

        # Fetch and normalize priority names
        cursor.execute('SELECT DISTINCT priorite_name FROM "Dim_Priorite" WHERE priorite_name IS NOT NULL AND priorite_name != \'\';')
        priorities_raw = [row[0] for row in cursor.fetchall()]
        dropdown_data['priorities'] = sorted(list(set([p.strip() for p in priorities_raw])))

        # Fetch and normalize site names (SITE IS INCLUDED HERE)
        cursor.execute('SELECT DISTINCT site_name FROM "Dim_Site" WHERE site_name IS NOT NULL AND site_name != \'\';')
        site_names_raw = [row[0] for row in cursor.fetchall()]
        dropdown_data['siteNames'] = sorted(list(set([s.strip() for s in site_names_raw])))

        # --- IMPORTANT: Fetch and include years for the yearly comparison dropdowns ---
        cursor.execute('SELECT DISTINCT year FROM "Dim_Date" WHERE year IS NOT NULL ORDER BY year DESC;')
        years = [row[0] for row in cursor.fetchall()]
        dropdown_data['years'] = sorted(years, reverse=True) # Sort in descending order for default selection

        print("Dropdown data fetched successfully from DB.")
        return jsonify(dropdown_data)

    except Exception as e:
        print(f"Error fetching dropdown data: {e}")
        return jsonify({"error": f"Failed to fetch dropdown data: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()
            print("Database connection for dropdown data closed.")

# THIS REMAINS UNCHANGED (SITE IS INCLUDED for prediction)
@app.route('/predict_resolution', methods=['POST'])
def predict_resolution():
    """Endpoint for predicting incident resolution time."""
    if model is None:
        return jsonify({"error": "ML model is not trained or loaded. Server error."}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received. Please provide incident details."}), 400

    print("Received prediction request data:", data)

    try:
        # Prepare input data for prediction (SITE IS INCLUDED)
        processed_data = {
            'problem_type': data.get('problem_type', '').strip(),
            'service_name': data.get('service_name', '').strip(),
            'priorite_name': data.get('priorite_name', '').strip(),
            'site_name': data.get('site_name', '').strip(), # SITE IS INCLUDED HERE
            'open_year': int(data.get('open_year')),
            'open_month': int(data.get('open_month')),
            'open_day': int(data.get('open_day')),
            'open_hour': int(data.get('open_hour'))
        }
        input_df = pd.DataFrame([processed_data])

        # Apply encoding and ensure feature order
        for col in ALL_FEATURES: # ALL_FEATURES includes 'site_name'
            if col in CATEGORICAL_FEATURES:
                le = encoders[col]
                input_category = input_df[col].iloc[0]

                if input_category in le.classes_:
                    input_df[col] = le.transform([input_category])
                else:
                    # Handle unseen category: map to the first known class (simple strategy)
                    # For production, consider more robust OOV handling or retraining.
                    if le.classes_.size > 0:
                        input_df[col] = le.transform([le.classes_[0]])
                        print(f"Warning: Unseen category '{input_category}' for '{col}'. Mapping to '{le.classes_[0]}'.")
                    else:
                        input_df[col] = 0 # Fallback if no classes are fitted (should not happen if model trained)
            # Numerical features are already in their final form (int)

        input_df = input_df[ALL_FEATURES] # Ensure columns are in the exact order the model was trained on
        prediction = model.predict(input_df)[0]

        return jsonify({"predicted_time_minutes": prediction})

    except KeyError as e:
        return jsonify({"error": f"Missing required input field or invalid type: {e}. Please provide all necessary fields correctly."}), 400
    except ValueError as e:
        return jsonify({"error": f"Invalid data type or value for input: {e}. Please ensure inputs are valid."}), 400
    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": f"An internal server error occurred: {str(e)}"}), 500

# THIS REMAINS UNCHANGED (SITE IS INCLUDED for recommendation)
@app.route('/recommend_solution', methods=['POST'])
def recommend_solution():
    """Endpoint for recommending solutions based on incident characteristics."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received. Please provide incident details for recommendation."}), 400

    print("Received solution recommendation request data:", data)

    problem_type = data.get('problem_type', '').strip()
    service_name = data.get('service_name', '').strip()
    priorite_name = data.get('priorite_name', '').strip()
    site_name = data.get('site_name', '').strip() # SITE IS INCLUDED HERE

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        sql_query = f"""
        SELECT
            dp.solution_description,
            AVG(fi.time_to_resolve_minutes) AS average_resolution_time_minutes
        FROM
            "Fact_Incidents" fi
        JOIN
            "Dim_Problem" dp ON fi.problem_sk = dp.problem_sk
        JOIN
            "Dim_Service" ds ON fi.service_sk = ds.service_sk
        JOIN
            "Dim_Priorite" dpr ON fi.priorite_sk = dpr.priorite_sk
        JOIN
            "Dim_Site" dsi ON fi.site_sk = dsi.site_sk -- JOIN to Dim_Site IS INCLUDED
        WHERE
            dp.problem_type ILIKE %s AND dp.solution_description IS NOT NULL AND dp.solution_description != ''
            AND ds.service_name ILIKE %s
            AND dpr.priorite_name ILIKE %s
            AND dsi.site_name ILIKE %s -- SITE CONDITION IS INCLUDED
            AND fi.time_to_resolve_minutes IS NOT NULL AND fi.time_to_resolve_minutes > 0
        GROUP BY
            dp.solution_description
        ORDER BY
            average_resolution_time_minutes ASC
        LIMIT 5; -- Recommend top 5 solutions
        """
        # Parameters for cursor.execute (SITE IS INCLUDED)
        cursor.execute(sql_query, (problem_type, service_name, priorite_name, site_name))
        results = cursor.fetchall()

        recommended_solutions = []
        for row in results:
            recommended_solutions.append({
                "solution_description": row[0].strip(),
                "average_resolution_time_minutes": row[1]
            })

        print(f"Found {len(recommended_solutions)} solutions for the criteria.")
        return jsonify(recommended_solutions)

    except Exception as e:
        print(f"Error during solution recommendation: {e}")
        return jsonify({"error": f"An internal server error occurred during recommendation: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()
            print("Database connection closed for recommendation.")

# THIS REMAINS UNCHANGED (SITE IS INCLUDED for hotspots)
@app.route('/get_incident_hotspots', methods=['GET'])
def get_incident_hotspots():
    """Detects and returns 'real-time' incident hotspots based on recent vs historical trends."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # --- TEMPORARY MODIFICATION FOR TESTING OLD DATA ---
        # Using the latest timestamp you provided: 2024-12-04 11:00:00
        current_time_for_analysis = datetime(2024, 12, 4, 11, 0, 0)
        # --- END TEMPORARY MODIFICATION ---

        current_window_start = current_time_for_analysis - timedelta(hours=24)
        historical_window_start = current_time_for_analysis - timedelta(days=30)
        historical_window_end = current_time_for_analysis - timedelta(hours=24)

        print(f"Hotspot analysis (SIMULATED): Current window from {current_window_start}")
        print(f"Hotspot analysis (SIMULATED): Historical window from {historical_window_start} to {historical_window_end}")

        current_incidents_query = """
        SELECT
            dp.problem_type,
            ds.service_name,
            dsi.site_name, -- SITE IS INCLUDED
            dpr.priorite_name,
            COUNT(fi.incident_sk) AS current_count
        FROM
            "Fact_Incidents" fi
        JOIN "Dim_Problem" dp ON fi.problem_sk = dp.problem_sk
        JOIN "Dim_Service" ds ON fi.service_sk = ds.service_sk
        JOIN "Dim_Site" dsi ON fi.site_sk = dsi.site_sk -- JOIN to Dim_Site IS INCLUDED
        JOIN "Dim_Priorite" dpr ON fi.priorite_sk = dpr.priorite_sk
        JOIN "Dim_Date" dd ON fi.date_ouverture_sk = dd.date_sk
        WHERE
            dd.full_timestamp >= %s AND dd.full_timestamp < %s
        GROUP BY
            dp.problem_type, ds.service_name, dsi.site_name, dpr.priorite_name -- SITE IS INCLUDED in GROUP BY
        HAVING
            COUNT(fi.incident_sk) > 0;
        """
        current_df = pd.read_sql_query(current_incidents_query, conn, params=(current_window_start, current_time_for_analysis))
        current_df.columns = ['problem_type', 'service_name', 'site_name', 'priority_name', 'current_incident_count'] # SITE IS INCLUDED
        print(f"Current incidents data loaded: {len(current_df)} rows.")

        if current_df.empty:
            return jsonify([]) # Return empty if no current incidents

        historical_incidents_query = """
        SELECT
            dp.problem_type,
            ds.service_name,
            dsi.site_name, -- SITE IS INCLUDED
            dpr.priorite_name,
            COUNT(fi.incident_sk) AS historical_count
        FROM
            "Fact_Incidents" fi
        JOIN "Dim_Problem" dp ON fi.problem_sk = dp.problem_sk
        JOIN "Dim_Service" ds ON fi.service_sk = ds.service_sk
        JOIN "Dim_Site" dsi ON fi.site_sk = dsi.site_sk -- JOIN to Dim_Site IS INCLUDED
        JOIN "Dim_Priorite" dpr ON fi.priorite_sk = dpr.priorite_sk
        JOIN "Dim_Date" dd ON fi.date_ouverture_sk = dd.date_sk
        WHERE
            dd.full_timestamp >= %s AND dd.full_timestamp < %s
        GROUP BY
            dp.problem_type, ds.service_name, dsi.site_name, dpr.priorite_name; -- SITE IS INCLUDED in GROUP BY
        """
        historical_df = pd.read_sql_query(
            historical_incidents_query, conn,
            params=(historical_window_start, historical_window_end)
        )
        historical_df.columns = ['problem_type', 'service_name', 'site_name', 'priority_name', 'historical_count'] # SITE IS INCLUDED
        print(f"Historical incidents data loaded: {len(historical_df)} rows.")

        historical_duration_hours = (historical_window_end - historical_window_start).total_seconds() / 3600
        current_window_duration_hours = (current_time_for_analysis - current_window_start).total_seconds() / 3600

        if historical_duration_hours <= 0:
            print("Warning: Historical duration is zero or negative. Cannot calculate meaningful averages.")
            return jsonify([])

        historical_df['historical_avg_count'] = (
            historical_df['historical_count'] / historical_duration_hours
        ) * current_window_duration_hours

        merged_df = pd.merge(
            current_df,
            historical_df[['problem_type', 'service_name', 'site_name', 'priority_name', 'historical_avg_count']], # SITE IS INCLUDED
            on=['problem_type', 'service_name', 'site_name', 'priority_name'], # SITE IS INCLUDED in `on` clause
            how='left'
        )

        merged_df['historical_avg_count'].fillna(0, inplace=True)

        merged_df['deviation_percentage'] = merged_df.apply(
            lambda row: ((row['current_incident_count'] - row['historical_avg_count']) / row['historical_avg_count'] * 100)
                        if row['historical_avg_count'] > 0 else (
                            1000 if row['current_incident_count'] > 0 else 0 # Very high change if current > 0 but historical = 0
                        ), axis=1
        )

        hotspots_df = merged_df[
            ((merged_df['current_incident_count'] >= 2) & (merged_df['deviation_percentage'] >= 50)) |
            ((merged_df['current_incident_count'] > 0) & (merged_df['historical_avg_count'] == 0))
        ].copy()

        hotspots_df['deviation_description'] = hotspots_df.apply(lambda row:
            "New Problem Type Emergence" if row['historical_avg_count'] == 0 and row['current_incident_count'] > 0 else (
                "Critical Spike" if row['deviation_percentage'] >= 200 else (
                "Significant Increase" if row['deviation_percentage'] >= 100 else (
                "Moderate Increase" if row['deviation_percentage'] >= 50 else "Normal Fluctuation"
                ))
            ), axis=1
        )

        hotspots_df.sort_values(by='deviation_percentage', ascending=False, inplace=True)

        hotspots_list = hotspots_df.to_dict(orient='records')
        print(f"Detected {len(hotspots_list)} incident hotspots.")

        return jsonify(hotspots_list)

    except Exception as e:
        print(f"Error in get_incident_hotspots: {e}")
        return jsonify({"error": f"Failed to get incident hotspots: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()
            print("Database connection closed for hotspots.")


# --- MODIFIED: get_yearly_incident_comparison (SITE REMOVED FOR THIS FUNCTION ONLY) ---
@app.route('/get_yearly_incident_comparison', methods=['GET'])
def get_yearly_incident_comparison():
    """Compares incident counts between two specified years."""
    conn = None
    try:
        year1 = request.args.get('year1', type=int)
        year2 = request.args.get('year2', type=int)

        if not year1 or not year2:
            return jsonify({"error": "Please provide both 'year1' and 'year2' parameters."}), 400

        print(f"Fetching yearly incident comparison for {year1} vs {year2}")

        conn = get_db_connection()
        cursor = conn.cursor()

        base_query = """
        SELECT
            dp.problem_type,
            ds.service_name,
            dpr.priorite_name,
            COUNT(fi.incident_sk) AS incident_count
        FROM
            "Fact_Incidents" fi
        JOIN "Dim_Problem" dp ON fi.problem_sk = dp.problem_sk
        JOIN "Dim_Service" ds ON fi.service_sk = ds.service_sk
        JOIN "Dim_Priorite" dpr ON fi.priorite_sk = dpr.priorite_sk
        JOIN "Dim_Date" dd ON fi.date_ouverture_sk = dd.date_sk
        WHERE
            dd.year = %s
        GROUP BY
            dp.problem_type, ds.service_name, dpr.priorite_name; -- SITE REMOVED FROM GROUP BY
        """

        df_year1 = pd.read_sql_query(base_query, conn, params=(year1,))
        df_year1.columns = ['problem_type', 'service_name', 'priority_name', f'count_{year1}'] # SITE REMOVED FROM COLUMNS
        print(f"Data for {year1} loaded: {len(df_year1)} rows.")

        df_year2 = pd.read_sql_query(base_query, conn, params=(year2,))
        df_year2.columns = ['problem_type', 'service_name', 'priority_name', f'count_{year2}'] # SITE REMOVED FROM COLUMNS
        print(f"Data for {year2} loaded: {len(df_year2)} rows.")

        merged_df = pd.merge(
            df_year1,
            df_year2,
            on=['problem_type', 'service_name', 'priority_name'], # SITE REMOVED FROM 'ON' CLAUSE
            how='outer'
        )

        merged_df[f'count_{year1}'].fillna(0, inplace=True)
        merged_df[f'count_{year2}'].fillna(0, inplace=True)

        merged_df['percentage_change'] = merged_df.apply(lambda row:
            ((row[f'count_{year2}'] - row[f'count_{year1}']) / row[f'count_{year1}']) * 100
            if row[f'count_{year1}'] > 0 else (
                1000000 if row[f'count_{year2}'] > 0 else 0
            ), axis=1
        )

        merged_df['change_description'] = merged_df.apply(lambda row:
            "No Change" if row[f'count_{year1}'] == 0 and row[f'count_{year2}'] == 0 else (
            "Newly Emerged" if row[f'count_{year1}'] == 0 and row[f'count_{year2}'] > 0 else (
            "Completely Resolved" if row[f'count_{year2}'] == 0 and row[f'count_{year1}'] > 0 else (
            "Critical Spike" if row['percentage_change'] >= 200 else (
            "Significant Increase" if row['percentage_change'] >= 50 else (
            "Moderate Increase" if row['percentage_change'] >= 10 else (
            "Significant Decrease" if row['percentage_change'] <= -50 else (
            "Moderate Decrease" if row['percentage_change'] <= -10 else "No Significant Change"
            ))))))), axis=1
        )

        significant_changes_df = merged_df[
            (abs(merged_df['percentage_change']) >= 10) | # Significant change threshold
            ((merged_df[f'count_{year1}'] == 0) & (merged_df[f'count_{year2}'] > 0)) | # Newly emerged in year2
            ((merged_df[f'count_{year2}'] == 0) & (merged_df[f'count_{year1}'] > 0)) | # Disappeared in year2
            ((merged_df[f'count_{year1}'] == 0) & (merged_df[f'count_{year2}'] == 0)) # Explicitly include 0-0 if you want to show them
        ].copy()

        significant_changes_df['abs_percentage_change'] = significant_changes_df['percentage_change'].abs()
        significant_changes_df.sort_values(by='abs_percentage_change', ascending=False, inplace=True)
        significant_changes_df.drop(columns=['abs_percentage_change'], inplace=True)

        yearly_comparison_list = significant_changes_df.to_dict(orient='records')
        print(f"Found {len(yearly_comparison_list)} significant yearly changes.")

        return jsonify(yearly_comparison_list)

    except Exception as e:
        print(f"Error in get_yearly_incident_comparison: {e}")
        return jsonify({"error": f"An internal server error occurred during yearly comparison: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()
            print("Database connection closed for yearly comparison.")

if __name__ == '__main__':
    app.run(debug=True, port=5000)