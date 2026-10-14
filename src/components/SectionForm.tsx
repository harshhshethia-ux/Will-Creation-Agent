import React from 'react';
import {
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2
} from 'lucide-react';
import { WillData, AssetCategory, OwnershipType, AssetOrigin } from '../types/will';
import { validateWillData } from '../utils/validation';
import { calculateAge } from '../utils/numberToIndianWords';

interface SectionFormProps {
  data: WillData;
  onUpdateData: (updater: (prev: WillData) => WillData) => void;
  targetSection?: number;
}

const ASSET_CATEGORIES: AssetCategory[] = [
  'immovable',
  'bank account',
  'fixed deposit',
  'mutual fund',
  'shares and demat',
  'PMS or AIF',
  'insurance',
  'PF or PPF',
  'vehicle',
  'jewellery',
  'business interest',
  'digital asset',
  'personal item',
];

export const SectionForm: React.FC<SectionFormProps> = ({
  data,
  onUpdateData,
}) => {
  const validation = validateWillData(data);

  // Add Asset Row
  const handleAddAsset = () => {
    onUpdateData(prev => ({
      ...prev,
      assets: [
        ...prev.assets,
        {
          id: `a_${Date.now()}`,
          category: 'bank account',
          description: '',
          ownership: 'sole',
          origin: 'self-acquired',
          nominee: '',
          beneficiary: prev.beneficiaries[0]?.name || '',
          bankName: '',
          accountType: 'Savings Account',
          accountLast4: '',
        },
      ],
    }));
  };

  const handleRemoveAsset = (id: string) => {
    onUpdateData(prev => ({
      ...prev,
      assets: prev.assets.filter(a => a.id !== id),
    }));
  };

  // Add Beneficiary Row
  const handleAddBeneficiary = () => {
    onUpdateData(prev => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        {
          id: `b_${Date.now()}`,
          name: '',
          relationship: '',
          dob: '',
          isMinor: false,
          address: '',
          contact: '',
          type: 'individual',
          sharePercentage: 0,
          alternate: '',
        },
      ],
    }));
  };

  const handleRemoveBeneficiary = (id: string) => {
    onUpdateData(prev => ({
      ...prev,
      beneficiaries: prev.beneficiaries.filter(b => b.id !== id),
    }));
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16">
      {/* Top Advisory Strip */}
      <div className="bg-stone-50 border border-stone-200 p-4 rounded text-xs text-stone-700 flex items-start gap-3">
        <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-stone-900">Approved Clause Library Synchronisation: </strong>
          Any changes made here directly feed into Clauses C0 through C28 of your Last Will and Testament. All rules from the Indian Succession Act, 1925 and Hindu Succession Act, 1956 are validated continuously.
        </p>
      </div>

      {/* SECTION 4: ASSETS & NOMINATIONS */}
      <section className="bg-white rounded-lg border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider font-mono text-stone-500">Section 4</p>
            <h3 className="text-xl font-serif font-bold text-stone-900">Schedule of Assets & Nominations</h3>
          </div>
          <button
            onClick={handleAddAsset}
            className="px-3.5 py-1.5 text-xs font-semibold bg-stone-900 text-amber-100 hover:bg-stone-800 rounded transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Asset Row</span>
          </button>
        </div>

        {data.assets.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-200 rounded text-stone-500 text-xs">
            No specific assets added. Click "Add Asset Row" above to specify immovable property, bank accounts, demat folios, or valuables.
          </div>
        ) : (
          <div className="space-y-4">
            {data.assets.map((asset, idx) => (
              <div key={asset.id} className="p-4 rounded border border-stone-200 bg-stone-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs uppercase tracking-wide text-stone-900">
                    Asset #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveAsset(asset.id)}
                    className="text-stone-400 hover:text-red-600 transition-colors"
                    title="Remove asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Asset Category</label>
                    <select
                      value={asset.category}
                      onChange={e => {
                        const cat = e.target.value as AssetCategory;
                        onUpdateData(prev => ({
                          ...prev,
                          assets: prev.assets.map(a => a.id === asset.id ? { ...a, category: cat } : a),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    >
                      {ASSET_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Ownership Type</label>
                    <select
                      value={asset.ownership}
                      onChange={e => {
                        const own = e.target.value as OwnershipType;
                        onUpdateData(prev => ({
                          ...prev,
                          assets: prev.assets.map(a => a.id === asset.id ? { ...a, ownership: own } : a),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    >
                      <option value="sole">Sole Ownership</option>
                      <option value="joint">Joint Ownership</option>
                      <option value="HUF">HUF / Coparcenary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Origin of Asset</label>
                    <select
                      value={asset.origin}
                      onChange={e => {
                        const orig = e.target.value as AssetOrigin;
                        onUpdateData(prev => ({
                          ...prev,
                          assets: prev.assets.map(a => a.id === asset.id ? { ...a, origin: orig } : a),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    >
                      <option value="self-acquired">Self-acquired</option>
                      <option value="inherited">Inherited</option>
                      <option value="ancestral">Ancestral</option>
                    </select>
                  </div>

                  {asset.ownership === 'joint' && (
                    <>
                      <div>
                        <label className="block font-medium text-stone-700 mb-1">Your Share %</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          placeholder="e.g. 50"
                          value={asset.sharePercent || ''}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            onUpdateData(prev => ({
                              ...prev,
                              assets: prev.assets.map(a => a.id === asset.id ? { ...a, sharePercent: val } : a),
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-stone-700 mb-1">Co-Owner Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Sunita Sharma"
                          value={asset.coOwnerName || ''}
                          onChange={e => {
                            const val = e.target.value;
                            onUpdateData(prev => ({
                              ...prev,
                              assets: prev.assets.map(a => a.id === asset.id ? { ...a, coOwnerName: val } : a),
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                        />
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-3">
                    <label className="block font-medium text-stone-700 mb-1">
                      Description (Address, Survey No, Flat No, or Asset details)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Residential Apartment Flat No. 402, Magnolia Residency, Kothrud"
                      value={asset.description}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdateData(prev => ({
                          ...prev,
                          assets: prev.assets.map(a => a.id === asset.id ? { ...a, description: val } : a),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  {/* Category-Specific fields */}
                  {asset.category === 'immovable' && (
                    <div className="sm:col-span-3">
                      <label className="block font-medium text-stone-700 mb-1">Property Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Survey No. 84/2, Kothrud, Pune 411038"
                        value={asset.propertyAddress || ''}
                        onChange={e => {
                          const val = e.target.value;
                          onUpdateData(prev => ({
                            ...prev,
                            assets: prev.assets.map(a => a.id === asset.id ? { ...a, propertyAddress: val } : a),
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                      />
                    </div>
                  )}

                  {(asset.category === 'bank account' || asset.category === 'fixed deposit') && (
                    <>
                      <div>
                        <label className="block font-medium text-stone-700 mb-1">Bank Name & Branch</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC Bank, Kothrud"
                          value={asset.bankName || ''}
                          onChange={e => {
                            const val = e.target.value;
                            onUpdateData(prev => ({
                              ...prev,
                              assets: prev.assets.map(a => a.id === asset.id ? { ...a, bankName: val } : a),
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-stone-700 mb-1">Account / Deposit Type</label>
                        <input
                          type="text"
                          placeholder="Savings / Term Deposit"
                          value={asset.accountType || ''}
                          onChange={e => {
                            const val = e.target.value;
                            onUpdateData(prev => ({
                              ...prev,
                              assets: prev.assets.map(a => a.id === asset.id ? { ...a, accountType: val } : a),
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-stone-700 mb-1">Last 4 Digits of Account</label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="e.g. 4190"
                          value={asset.accountLast4 || ''}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            onUpdateData(prev => ({
                              ...prev,
                              assets: prev.assets.map(a => a.id === asset.id ? { ...a, accountLast4: val } : a),
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white font-mono text-center"
                        />
                      </div>
                    </>
                  )}

                  {(asset.category === 'shares and demat' || asset.category === 'mutual fund' || asset.category === 'PMS or AIF' || asset.category === 'PF or PPF') && (
                    <>
                      <div className="sm:col-span-2">
                        <label className="block font-medium text-stone-700 mb-1">Institution / Depository Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Zerodha Broking Ltd (CDSL) / SBI Mutual Fund"
                          value={asset.institutionName || ''}
                          onChange={e => {
                            const val = e.target.value;
                            onUpdateData(prev => ({
                              ...prev,
                              assets: prev.assets.map(a => a.id === asset.id ? { ...a, institutionName: val } : a),
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-stone-700 mb-1">Reference / Folio Last 4</label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="e.g. 9012"
                          value={asset.referenceLast4 || ''}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            onUpdateData(prev => ({
                              ...prev,
                              assets: prev.assets.map(a => a.id === asset.id ? { ...a, referenceLast4: val } : a),
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white font-mono text-center"
                        />
                      </div>
                    </>
                  )}

                  {asset.category === 'insurance' && (
                    <>
                      <div className="sm:col-span-2">
                        <label className="block font-medium text-stone-700 mb-1">Insurer Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Life Insurance Corporation of India"
                          value={asset.insurerName || ''}
                          onChange={e => {
                            const val = e.target.value;
                            onUpdateData(prev => ({
                              ...prev,
                              assets: prev.assets.map(a => a.id === asset.id ? { ...a, insurerName: val } : a),
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-stone-700 mb-1">Policy Last 4 Digits</label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="e.g. 6743"
                          value={asset.policyLast4 || ''}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            onUpdateData(prev => ({
                              ...prev,
                              assets: prev.assets.map(a => a.id === asset.id ? { ...a, policyLast4: val } : a),
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white font-mono text-center"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Nominee on Record with Institution</label>
                    <input
                      type="text"
                      placeholder="e.g. Sunita Sharma"
                      value={asset.nominee}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdateData(prev => ({
                          ...prev,
                          assets: prev.assets.map(a => a.id === asset.id ? { ...a, nominee: val } : a),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-stone-700 mb-1">Designated Beneficiary under this Will</label>
                    <input
                      type="text"
                      placeholder="e.g. Sunita Rajesh Sharma"
                      value={asset.beneficiary}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdateData(prev => ({
                          ...prev,
                          assets: prev.assets.map(a => a.id === asset.id ? { ...a, beneficiary: val } : a),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>
                </div>

                {/* Warnings inline */}
                {asset.nominee && asset.beneficiary && asset.nominee.trim().toLowerCase() !== asset.beneficiary.trim().toLowerCase() && (
                  <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Nominee mismatch warning: Nominee on record is "{asset.nominee}", but beneficiary is "{asset.beneficiary}". A nominee collects the asset but may not be the final owner. Your will decides who owns it. Tell your nominee in advance.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 5: BENEFICIARIES */}
      <section className="bg-white rounded-lg border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider font-mono text-stone-500">Section 5</p>
            <h3 className="text-xl font-serif font-bold text-stone-900">Beneficiary Schedule</h3>
          </div>
          <button
            onClick={handleAddBeneficiary}
            className="px-3.5 py-1.5 text-xs font-semibold bg-stone-900 text-amber-100 hover:bg-stone-800 rounded transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Beneficiary</span>
          </button>
        </div>

        {data.beneficiaries.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-200 rounded text-stone-500 text-xs">
            No beneficiaries registered. Click "Add Beneficiary" above to record family members, individuals or charities.
          </div>
        ) : (
          <div className="space-y-4">
            {data.beneficiaries.map((b, idx) => (
              <div key={b.id} className="p-4 rounded border border-stone-200 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs uppercase tracking-wide text-stone-900">
                    Beneficiary #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveBeneficiary(b.id)}
                    className="text-stone-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sunita Rajesh Sharma"
                      value={b.name}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdateData(prev => ({
                          ...prev,
                          beneficiaries: prev.beneficiaries.map(ben => ben.id === b.id ? { ...ben, name: val } : ben),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      placeholder="e.g. Spouse / Son / Daughter"
                      value={b.relationship}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdateData(prev => ({
                          ...prev,
                          beneficiaries: prev.beneficiaries.map(ben => ben.id === b.id ? { ...ben, relationship: val } : ben),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Type</label>
                    <select
                      value={b.type}
                      onChange={e => {
                        const val = e.target.value as 'individual' | 'charity';
                        onUpdateData(prev => ({
                          ...prev,
                          beneficiaries: prev.beneficiaries.map(ben => ben.id === b.id ? { ...ben, type: val } : ben),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    >
                      <option value="individual">Individual</option>
                      <option value="charity">Registered Charity / Trust</option>
                    </select>
                  </div>

                  {b.type === 'charity' && (
                    <div className="sm:col-span-3">
                      <label className="block font-medium text-stone-700 mb-1">Charity Registration Number</label>
                      <input
                        type="text"
                        placeholder="e.g. Trust Reg. No. E-1234 (Pune)"
                        value={b.charityRegNo || ''}
                        onChange={e => {
                          const val = e.target.value;
                          onUpdateData(prev => ({
                            ...prev,
                            beneficiaries: prev.beneficiaries.map(ben => ben.id === b.id ? { ...ben, charityRegNo: val } : ben),
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-stone-700 mb-1">Residential / Registered Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 402, Magnolia Residency, Kothrud, Pune"
                      value={b.address}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdateData(prev => ({
                          ...prev,
                          beneficiaries: prev.beneficiaries.map(ben => ben.id === b.id ? { ...ben, address: val } : ben),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Residue Share % (Optional)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g. 50"
                      value={b.sharePercentage || ''}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10) || 0;
                        onUpdateData(prev => ({
                          ...prev,
                          beneficiaries: prev.beneficiaries.map(ben => ben.id === b.id ? { ...ben, sharePercentage: val } : ben),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-medium text-stone-700 mb-1">
                      Alternate Beneficiary (if this person predeceases you)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. My children in equal shares"
                      value={b.alternate}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdateData(prev => ({
                          ...prev,
                          beneficiaries: prev.beneficiaries.map(ben => ben.id === b.id ? { ...ben, alternate: val } : ben),
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Share Total Checker */}
        {validation.residuaryShareTotal > 0 && (
          <div className={`p-3 rounded text-xs flex items-center justify-between border ${
            validation.residuaryShareTotal === 100
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            <span>Residuary percentage total across beneficiaries:</span>
            <span className="font-mono font-bold text-sm">{validation.residuaryShareTotal}% / 100%</span>
          </div>
        )}
      </section>
    </div>
  );
};
