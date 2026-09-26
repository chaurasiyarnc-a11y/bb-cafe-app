// --- Render (Part 2 - Continuation) ---

                .action-btn {
                    width: 100%; padding: 18px; border-radius: 16px; border: none;
                    font-size: 18px; font-weight: 900; color: #fff;
                    background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
                    cursor: pointer; transition: transform 0.2s;
                }
                .action-btn:active { transform: scale(0.95); }

                .wheel-container {
                    position: relative; width: 300px; height: 300px; margin: 30px auto;
                    border-radius: 50%; border: 10px solid #1e293b;
                    overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.5);
                    transition: transform 5.5s cubic-bezier(0.17, 0.67, 0.12, 0.99);
                }
                
                .segment {
                    position: absolute; width: 50%; height: 50%; transform-origin: 100% 100%;
                    display: flex; align-items: center; justify-content: center;
                }
            `}</style>

            <Toaster position="top-center" />

            <div className="main-container">
                <div className="glass-card">
                    {!isLoggedIn ? (
                        <form onSubmit={handleLogin}>
                            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>भाग्यशाली पहिया 🎡</h2>
                            <p className="input-label">अपना नाम</p>
                            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="राहुल शर्मा" required />
                            
                            <p className="input-label">मोबाइल नंबर</p>
                            <input className="input-field" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" required />
                            
                            <button className="action-btn" disabled={isLoading} type="submit">
                                {isLoading ? "प्रोसेसिंग..." : "खेल शुरू करें"}
                            </button>
                        </form>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <h3>नमस्ते, {name}!</h3>
                            <p style={{ color: '#94a3b8' }}>{tableNo}</p>

                            <div className="wheel-container" style={{ transform: `rotate(${currentRotation}deg)` }}>
                                {PRIZE_SEGMENTS.map((s, i) => (
                                    <div key={i} className="segment" style={{ 
                                        backgroundColor: s.color,
                                        transform: `rotate(${i * 45}deg) skewY(-45deg)` 
                                    }}>
                                        <div style={{ transform: 'skewY(45deg) rotate(22deg)', fontSize: '20px' }}>{s.icon}</div>
                                    </div>
                                ))}
                            </div>

                            <button className="action-btn" onClick={executeSpin} disabled={isSpinning || !!couponCode}>
                                {isSpinning ? "घुम रहा है..." : "स्पिन करें! 🎡"}
                            </button>

                            {couponCode && (
                                <div style={{ marginTop: '20px', padding: '15px', background: '#1e293b', borderRadius: '12px' }}>
                                    <p>बधाई हो! आपका कोड:</p>
                                    <h2 style={{ color: '#38bdf8', margin: '5px 0' }}>{couponCode}</h2>
                                    <p style={{ fontSize: '14px' }}>{timerText}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
