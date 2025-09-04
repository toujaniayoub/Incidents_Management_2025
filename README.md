# 📊 Business Intelligence & Predictive Analytics Solution for Incident Management

> 🚀 *An engineering internship project at **Tunisie Telecom**, designed to transform raw incident data into actionable insights. The solution combines Business Intelligence (BI), Machine Learning, and interactive dashboards to move from reactive to proactive incident management.*  

---

## 📖 Table of Contents
- [🎯 Project Overview](#-project-overview)
- [💡 Solution Architecture](#-solution-architecture)
- [✨ Key Features](#-key-features)
- [🛠 Tech Stack](#-tech-stack)
- [📂 Project Structure](#-project-structure)
- [⚙️ Installation and Execution Steps](#️-installation-and-execution-steps)
- [📸 Screenshots](#-screenshots)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [👨‍💻 Author](#-author)

---

## 🎯 Project Overview
In the fast-paced world of telecommunications, managing service incidents is critical.  
This project addresses the challenge of analyzing a **massive volume of incident data** and provides:  
- A **BI system** for performance monitoring.  
- A **predictive analytics component** to anticipate and manage future incidents.  
- An **integrated web application** for centralized access.  

---

## 💡 Solution Architecture
The solution is based on a **multi-layered architecture**:  

1. **Data Layer** – Extract, Transform, Load (ETL) process loads incident data into a centralized **PostgreSQL Data Warehouse**.  
2. **Analytics Layer** – Machine Learning models predict incident resolution times and detect trends.  
3. **Visualization Layer** – Interactive dashboards (Power BI) provide visual insights into incident trends & KPIs.  
4. **Application Layer** – A **Flask + Angular web application** integrates all components into a user-friendly interface.  

---

## ✨ Key Features
- 📥 **Data Integration** – Automated extraction and preparation of incident data (Talend).  
- 📊 **Performance Dashboards** – Track KPIs, monitor resolution times, and visualize incident trends (Power BI).  
- 🔮 **Predictive Analytics** – ML models forecast incident resolution times to support proactive decisions.  
- 🌐 **Web Application** – Centralized interface combining BI dashboards and predictive tools.  

---

## 🛠 Tech Stack

**Data Integration:** Power BI, Talend  
**Database:** PostgreSQL  
**Backend:** Flask (Python)  
**Frontend:** Angular  
**Machine Learning:** Scikit-learn, Pandas, NumPy, Jupyter  

---

## 📂 Project Structure
```bash
Incident-Management-BI-Analytics/
│
├── ETL/                 # Talend jobs and data processing workflows
├── data/                # Raw and cleaned datasets
├── models/              # Trained ML models (Pickle files)
├── notebooks/           # Jupyter notebooks for ML training and EDA
├── PowerBI/             # Power BI dashboards (.pbix)
├── frontend/            # Angular web app
├── backend/             # Flask API (Python)
├── requirements.txt     # Python dependencies
└── README.md            # Project documentation
