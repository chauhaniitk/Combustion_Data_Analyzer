# Combustion Data Analyzer & TDC Shift Tool

**Access the tool directly alongside your engine data:** 
## 🚀 Use it Live at: 
 
👉 **[https://combustion-data-and-tdc-offset.netlify.app/](https://combustion-data-and-tdc-offset.netlify.app/)**

---

## 📖 About This Project

This is a **Combustion Analysis Tool** which uses the in-cylinder pressure data to calculate and plot various combustion parameters. In combustion analysis, TDC determined by peak pressure is not same geometric TDC due to the thermodynamic loss angle. This tool allows to study the effct of TDC shift on the combustion parameters. 

### Key Features
*   **TDC Shift Simulation**: Instantly visualize how shifting the crank angle phasing affects your P-nm, Log P-Log V, and heat release curves.
*   **Comprehensive Metrics**: Automatically calculates **IMEP**, **Peak Pressure**, **CA10/50/90**, and **Max RoPR**.
*   **Advanced Visualization**: Interactive charts for:
    *   **P-θ** (Pressure vs. Crank Angle)
    *   **P-V & Log P-Log V** Diagrams (Thermodynamic Cycles)
    *   **HRR** (Heat Release Rate) & **CHR** (Cumulative Heat Release)
    *   **RoPR** (Rate of Pressure Rise)
*   **Data Processing**: Built-in smoothing (Moving Average, Savitzky-Golay) to clean noisy signal data.

## 🛠️ Run Locally

**Prerequisites:** Node.js

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run the app:**
    ```bash
    npm run dev
    ```
