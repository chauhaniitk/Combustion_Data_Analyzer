import React from 'react';
import { X, BookOpen } from 'lucide-react';

interface PhysicsInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhysicsInfo: React.FC<PhysicsInfoProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-[#800000] text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <BookOpen size={24} />
            <h2 className="text-xl font-bold">Methodology & Physics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#a00000] rounded-full transition-colors text-white/80 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8 text-gray-800 leading-relaxed font-sans">

          <section>
            <h3 className="text-lg font-bold text-[#800000] mb-3 border-b border-red-100 pb-2">1. Cylinder Volume (Slider-Crank Mechanism)</h3>
            <p className="mb-4 text-sm text-gray-600">
              The instantaneous cylinder volume <i>V(θ)</i> at crank angle <i>θ</i> is calculated using the standard slider-crank relationship.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-base text-center font-serif my-4">
              V(θ) = V<sub>c</sub> + <span className="inline-block align-middle text-center"><span className="block border-b border-black">V<sub>s</sub></span><span className="block">2</span></span> [ 1 - cos(θ) + R - <span className="inline-block">√<span className="border-t border-black">R<sup>2</sup> - sin<sup>2</sup>(θ)</span></span> ]
            </div>
            <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-gray-600">
              <li><b>V<sub>c</sub></b>: Clearance Volume = V<sub>s</sub> / (r<sub>c</sub> - 1)</li>
              <li><b>V<sub>s</sub></b>: Swept Volume (User Input)</li>
              <li><b>R</b>: Ratio of Connecting Rod Length to Crank Radius (<i>l / a</i>)</li>
              <li><b>a</b>: Crank Radius = Stroke / 2</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-[#800000] mb-3 border-b border-red-100 pb-2">2. Net Heat Release Rate (HRR)</h3>
            <p className="mb-4 text-sm text-gray-600">
              The Net Heat Release Rate is computed using the First Law of Thermodynamics for a closed system, assuming ideal gas behavior.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-base text-center font-serif my-4">
              <span className="inline-block align-middle text-center"><span className="block border-b border-black">dQ</span><span className="block">dθ</span></span>
              &nbsp;=&nbsp;
              <span className="inline-block align-middle text-center"><span className="block border-b border-black">γ</span><span className="block">γ - 1</span></span> P <span className="inline-block align-middle text-center"><span className="block border-b border-black">dV</span><span className="block">dθ</span></span>
              &nbsp;+&nbsp;
              <span className="inline-block align-middle text-center"><span className="block border-b border-black">1</span><span className="block">γ - 1</span></span> V <span className="inline-block align-middle text-center"><span className="block border-b border-black">dP</span><span className="block">dθ</span></span>
            </div>
            <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-gray-600">
              <li><b>γ</b>: Polytropic index (Usually 1.33 for gasoline and 1.37 for diesel)</li>
              <li><b>P</b>: In-cylinder pressure (Pa)</li>
              <li><b>V</b>: Instantaneous volume (m³)</li>
              <li>Derivatives (dP/dθ, dV/dθ) are computed using the central difference method.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-[#800000] mb-3 border-b border-red-100 pb-2">3. Cumulative Heat Release (CHR)</h3>
            <p className="mb-4 text-sm text-gray-600">
              The cumulative heat release is the integral of the Heat Release Rate over the crank angle domain.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-base text-center font-serif my-4">
              Q<sub>cum</sub>(θ) = ∫ <span className="inline-block align-middle text-center"><span className="block border-b border-black">dQ</span><span className="block">dθ</span></span> dθ
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-[#800000] mb-3 border-b border-red-100 pb-2">4. Data Filtering</h3>
            <p className="mb-4 text-sm text-gray-600">
              Raw combustion data often contains high-frequency noise that can distort calculated metrics like RoPR. This tool uses two mathematical smoothing techniques:
            </p>

            <div className="mb-6">
              <h4 className="font-bold text-gray-800 text-sm mb-1">A. Moving Average Filter (Boxcar)</h4>
              <p className="text-sm text-gray-600 mb-2">
                The simplest form of smoothing which replaces each data point with the average of its neighbors within a window of size <i>2m + 1</i>.
              </p>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center font-serif text-lg leading-loose my-3 overflow-x-auto flex items-center justify-center gap-2">
                <span>y<sub>i</sub> = </span>
                <span className="inline-flex flex-col items-center justify-center mx-1">
                  <div className="border-b border-gray-800 leading-none px-1 text-sm">1</div>
                  <div className="leading-none px-1 text-sm">2m + 1</div>
                </span>
                <div className="inline-flex flex-col items-center justify-center mx-1 relative">
                  <span className="text-xs mb-[-4px]">m</span>
                  <span className="text-2xl leading-none">∑</span>
                  <span className="text-xs mt-[-4px]">j=-m</span>
                </div>
                <span>x<sub>i+j</sub></span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Where <i>y<sub>i</sub></i> is the smoothed value, <i>x</i> is the raw data, and <i>m</i> is the half-window size. While effective at reducing random noise, it tends to attenuate sharp peaks (like P<sub>max</sub>).
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 text-sm mb-1">B. Savitzky-Golay Filter (Polynomial)</h4>
              <p className="text-sm text-gray-600 mb-2">
                A digital filter that smooths data by fitting a low-degree polynomial to adjacent data points using the method of linear least squares.
              </p>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center font-serif text-lg leading-loose my-3 overflow-x-auto flex items-center justify-center gap-2">
                <span>y<sub>i</sub> = </span>
                <div className="inline-flex flex-col items-center justify-center mx-1 relative">
                  <span className="text-xs mb-[-4px]">m</span>
                  <span className="text-2xl leading-none">∑</span>
                  <span className="text-xs mt-[-4px]">j=-m</span>
                </div>
                <span>C<sub>j</sub> x<sub>i+j</sub></span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Where <i>C<sub>j</sub></i> are convolution coefficients derived from the polynomial fit.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-[#800000] mb-3 border-b border-red-100 pb-2">5. Calculated Parameters</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 border border-gray-200 rounded-lg">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border-b">Parameter</th>
                    <th className="px-4 py-2 border-b">Definition</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white border-b">
                    <td className="px-4 py-2 font-medium text-gray-900">P_max</td>
                    <td className="px-4 py-2">Peak Cylinder Pressure (The maximum pressure reached during the cycle)</td>
                  </tr>
                  <tr className="bg-gray-50 border-b">
                    <td className="px-4 py-2 font-medium text-gray-900">θ_Pmax</td>
                    <td className="px-4 py-2">Crank Angle at P_max (The timing of peak pressure)</td>
                  </tr>
                  <tr className="bg-white border-b">
                    <td className="px-4 py-2 font-medium text-gray-900">IMEP</td>
                    <td className="px-4 py-2">Indicated Mean Effective Pressure (Average pressure on piston during power stroke)</td>
                  </tr>
                  <tr className="bg-gray-50 border-b">
                    <td className="px-4 py-2 font-medium text-gray-900">RoPR_max</td>
                    <td className="px-4 py-2">Max Rate of Pressure Rise (The maximum value of dP/dθ)</td>
                  </tr>
                  <tr className="bg-white border-b">
                    <td className="px-4 py-2 font-medium text-gray-900">CA10</td>
                    <td className="px-4 py-2">Start of Combustion (Crank angle where 10% of total heat is released)</td>
                  </tr>
                  <tr className="bg-gray-50 border-b">
                    <td className="px-4 py-2 font-medium text-gray-900">CA50</td>
                    <td className="px-4 py-2">Center of Combustion (Crank angle where 50% of total heat is released)</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-2 font-medium text-gray-900">CA90</td>
                    <td className="px-4 py-2">End of Combustion (Crank angle where 90% of total heat is released)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-500">
          Engine Research Lab, IIT Kanpur
        </div>
      </div>
    </div>
  );
};