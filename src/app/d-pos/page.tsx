{/* TAB 9: CUSTOMERS & LOYALTY PROFILE */}
            {activeTab === 'customers' && (
              <div className="flex-1 p-6 h-full flex flex-col overflow-hidden space-y-4">
                
                {/* Header Actions */}
                <div className="flex justify-between items-center border-b border-neutral-300 dark:border-neutral-800 pb-3 shrink-0">
                  <div>
                    <h2 className="text-lg font-black uppercase text-orange-600 flex items-center gap-2">
                      <SafeUserPlus size={20} /> Customers Directory
                    </h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">सभी ग्राहकों की प्रोफाइल देखें और लॉयल्टी पॉइंट्स मैनेज करें।</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button onClick={fetchAllCustomers} disabled={isCustomersLoading} className="bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700">
                      {isCustomersLoading ? <Loader2 className="animate-spin" size={14} /> : <SafeRefreshCw size={14} />} Refresh
                    </button>
                    <label className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow cursor-pointer transition-colors">
                      <SafeFileText size={14} /> Import CSV
                      <input type="file" accept=".csv" className="hidden" onChange={handleImportCustomersCSV} />
                    </label>
                    <button onClick={openAddCustomerModal} className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow">
                      <SafeUserPlus size={14} /> + Add
                    </button>
                  </div>
                </div>

                {/* Stats & Sorting Header */}
                <div className="flex flex-col lg:flex-row gap-3 justify-between lg:items-center bg-orange-500/10 dark:bg-orange-500/5 border border-orange-500/20 p-3 rounded-2xl shrink-0">
                  <div className="flex gap-6 items-center px-2">
                    <div>
                      <p className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">Total Customers</p>
                      <p className="text-xl font-black font-mono text-neutral-900 dark:text-white">{totalCustomersCount}</p>
                    </div>
                    <div className="w-px h-8 bg-orange-500/20"></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Total Loyalty Points</p>
                      <p className="text-xl font-black font-mono text-neutral-900 dark:text-white">⭐ {totalPointsInSystem}</p>
                    </div>
                  </div>
                  
                  <div className="flex bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700 p-1 shadow-sm shrink-0">
                    <button onClick={() => setCustomerSortBy('recent')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerSortBy === 'recent' ? 'bg-orange-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>Recent</button>
                    <button onClick={() => setCustomerSortBy('spent_high')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerSortBy === 'spent_high' ? 'bg-green-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>Top Spender</button>
                    <button onClick={() => setCustomerSortBy('points_high')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerSortBy === 'points_high' ? 'bg-amber-500 text-black' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>High Points</button>
                    <button onClick={() => setCustomerSortBy('points_low')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerSortBy === 'points_low' ? 'bg-orange-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>Low Points</button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative shrink-0">
                  <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search customer by Name, Phone Number or Address..." 
                    value={customerTabSearch} 
                    onChange={e => setCustomerTabSearch(e.target.value)} 
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none font-bold shadow-sm focus:border-orange-500 transition-colors" 
                  />
                </div>

                {/* Customer Grid with Pagination */}
                <div className="flex-1 overflow-y-auto pr-1 pb-10 flex flex-col space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                    {isCustomersLoading ? (
                      <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                    ) : paginatedCustomers.length === 0 ? (
                      <div className="col-span-full text-center py-24 text-neutral-500 font-bold text-xs">कोई ग्राहक नहीं मिला।</div>
                    ) : (
                      paginatedCustomers.map(cust => (
                        <div key={cust.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:border-orange-500 transition-colors gap-3">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-black text-sm text-neutral-900 dark:text-white uppercase">{cust.name || 'Valued Guest'}</p>
                                    
                                    {/* Tags */}
                                    {(() => {
                                      let tag = ''; let tagClass = '';
                                      const spent = cust.totalSpent || 0;
                                      const visits = cust.totalVisits || 0;
                                      const daysSinceActive = cust.lastActive ? Math.floor((Date.now() - (cust.lastActive.toDate ? cust.lastActive.toDate().getTime() : new Date(cust.lastActive).getTime())) / (1000 * 3600 * 24)) : 0;
                                      
                                      if (daysSinceActive > 30) { tag = '😴 Sleeping'; tagClass = 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700'; }
                                      else if (spent >= 5000 || visits >= 10) { tag = '👑 VIP Guest'; tagClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700/50'; }
                                      else if (spent >= 2000) { tag = '🌟 Regular'; tagClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700/50'; }
                                      
                                      return tag ? <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase shadow-sm border ${tagClass}`}>{tag}</span> : null;
                                    })()}

                                    {(cust.importSource === 'SpinGame' || cust.importSource === 'CatchGame') && (
                                      <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30 text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase shadow-sm">
                                        🎰 {cust.importSource === 'CatchGame' ? 'Catch Game' : 'Spin Game'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-mono text-neutral-500 mt-0.5">📞 {cust.phone || cust.id}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                                  ⭐ {cust.points || 0} Pts
                                </span>
                                {cust.gamePoints > 0 && (
                                  <span className="bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                                    🎰 {cust.gamePoints} Game
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {cust.note && (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 px-2 py-1.5 rounded-lg mb-2">
                                <p className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400">📝 Note: {cust.note}</p>
                              </div>
                            )}

                            {cust.address ? (
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-2">📍 {cust.address}</p>
                            ) : (
                              <p className="text-[11px] text-neutral-400 italic mb-2">No address provided</p>
                            )}
                            <div className="flex justify-between pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                              <div>
                                <p className="text-[9px] font-black uppercase text-neutral-500">Spent / Visits</p>
                                <p className="text-sm font-mono font-black text-green-600 dark:text-green-500">₹{cust.totalSpent || 0} <span className="text-xs text-neutral-400">({cust.totalVisits || 0})</span></p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black uppercase text-neutral-500">Last Bill (पिछला बिल)</p>
                                <p className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                                  {cust.lastBillNumber ? `#${cust.lastBillNumber} - ₹${cust.lastBillAmount}` : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Buttons Row */}
                          <div className="flex gap-1.5 items-center relative overflow-visible">
                            <div className="relative flex-1">
                              <button onClick={() => setActiveWaDropdown(activeWaDropdown === cust.id ? null : cust.id)} className="w-full py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 transition-colors">
                                <SafeShare2 size={13} /> Message
                              </button>
                              {activeWaDropdown === cust.id && (
                                <div className="absolute bottom-full left-0 mb-1 flex flex-col bg-white dark:bg-neutral-800 border border-green-500/30 rounded-xl shadow-2xl w-48 overflow-hidden z-[100]">
                                  <div className="bg-green-50 dark:bg-green-900/30 px-3 py-1.5 flex justify-between items-center border-b border-green-200 dark:border-green-800">
                                    <span className="text-[9px] font-black uppercase text-green-700 dark:text-green-400">Select Message</span>
                                    <button onClick={() => setActiveWaDropdown(null)} className="text-red-500 hover:text-red-700"><X size={12} /></button>
                                  </div>
                                  <button onClick={() => { setActiveWaDropdown(null); window.open(`https://wa.me/91${cust.phone || cust.id}?text=Hi ${cust.name}, we miss you at Bum Bum Cafe! ☕ Visit us soon and enjoy a 20% OFF using code COMEBACK20.`, '_blank'); }} className="px-3 py-2.5 text-[10px] font-bold text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200">🥺 We Miss You Offer</button>
                                  <button onClick={() => { setActiveWaDropdown(null); window.open(`https://wa.me/91${cust.phone || cust.id}?text=Happy Birthday to your family member from Bum Bum Cafe! 🎂 Celebrate with us and get a surprise gift!`, '_blank'); }} className="px-3 py-2.5 text-[10px] font-bold text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200">🎂 Birthday Booking</button>
                                  <button onClick={() => { setActiveWaDropdown(null); window.open(`https://wa.me/91${cust.phone || cust.id}?text=Hi ${cust.name}, your Loyalty Points Balance is ⭐ ${cust.points || 0}. Redeem them on your next visit!`, '_blank'); }} className="px-3 py-2.5 text-[10px] font-bold text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200">⭐ Points Update</button>
                                </div>
                              )}
                            </div>
                            {currentUser?.role === 'admin' && (
                              <button type="button" onClick={() => handleDeleteCustomer(cust)} className="p-2 bg-red-50 dark:bg-red-950/30 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 dark:border-red-800/40 rounded-xl transition-all shrink-0 shadow-sm" title="ग्राहक को डिलीट करें">
                                <SafeTrash2 size={14} />
                              </button>
                            )}
                            <button onClick={() => openEditCustomerModal(cust)} className="flex-1 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 transition-colors">
                              <SafeEdit3 size={13} /> Edit
                            </button>
                            <button onClick={() => handleViewCustomerHistory(cust)} className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-colors">
                              <History size={14} /> History
                            </button>
                            <button onClick={() => {
                              triggerBeep('tap');
                              setCustomerPhone(cust.phone || cust.id);
                              setCustomerName(cust.name || 'Valued Guest');
                              setCustomerPoints(cust.points || 0);
                              setAddress(cust.address || '');
                              setActiveTab('billing');
                              toast.success(`${cust.name} का आर्डर शुरू किया गया! 🛒`);
                              setTimeout(() => searchInputRef.current?.focus(), 80);
                            }} className="flex-1 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-colors">
                              <SafeShoppingBag size={14} /> Order
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Next / Previous Buttons */}
                  {!isCustomersLoading && totalCustomerPages > 1 && (
                    <div className="flex justify-center items-center gap-4 py-4 mt-auto">
                      <button onClick={() => setCustomerCurrentPage(prev => Math.max(1, prev - 1))} disabled={customerCurrentPage === 1} className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white rounded-xl text-xs font-black uppercase shadow disabled:opacity-50 disabled:cursor-not-allowed">
                        <SafeChevronLeft size={16} className="inline mr-1" /> Previous
                      </button>
                      <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                        Page <span className="text-orange-600 dark:text-orange-400 font-black">{customerCurrentPage}</span> of {totalCustomerPages}
                      </span>
                      <button onClick={() => setCustomerCurrentPage(prev => Math.min(totalCustomerPages, prev + 1))} disabled={customerCurrentPage === totalCustomerPages} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase shadow disabled:opacity-50 disabled:cursor-not-allowed">
                        Next <SafeChevronRight size={16} className="inline ml-1" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
