import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [busStopCode, setBusStopCode] = useState('');
  const [busStops, setBusStops] = useState(() => {
    // Load bus stops from localStorage on initial render
    try {
      const savedBusStops = localStorage.getItem('busStops');
      if (savedBusStops) {
        return JSON.parse(savedBusStops);
      }
    } catch (error) {
      console.error('Error loading bus stops from localStorage:', error);
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState(process.env.REACT_APP_API_KEY || '');
  const [expandedStops, setExpandedStops] = useState({});
  const [editMode, setEditMode] = useState(false);

  const fetchBusArrival = async () => {
    if (!apiKey) {
      setError('Please enter your LTA DataMall API key');
      return;
    }

    if (!busStopCode) {
      setError('Please enter a bus stop code');
      return;
    }

    // Check if bus stop already exists
    const existingIndex = busStops.findIndex(stop => stop.code === busStopCode);
    if (existingIndex !== -1) {
      setError('Bus stop already added');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3001/api/bus-arrival?busStopCode=${busStopCode}&apiKey=${encodeURIComponent(apiKey)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Add new bus stop to the list
      const newBusStop = {
        code: busStopCode,
        data: data,
        customName: null,
        originalName: data.BusStopName,
        timestamp: new Date()
      };
      
      setBusStops(prev => [...prev, newBusStop]);
      setExpandedStops(prev => ({...prev, [busStopCode]: true}));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (code) => {
    setExpandedStops(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const removeBusStop = (code) => {
    setBusStops(prev => prev.filter(stop => stop.code !== code));
    setExpandedStops(prev => {
      const newState = {...prev};
      delete newState[code];
      return newState;
    });
  };

  const updateBusStopName = (code, newName) => {
    setBusStops(prev => prev.map(stop => 
      stop.code === code 
        ? { ...stop, customName: newName }
        : stop
    ));
  };

  const toggleEditMode = () => {
    // If exiting edit mode, reset empty names to null (default)
    if (editMode) {
      setBusStops(prev => prev.map(stop => {
        const name = stop.customName !== null && stop.customName !== undefined 
          ? stop.customName 
          : (stop.originalName || stop.data.BusStopName || '');
        
        // If name is empty, reset to null to show original name
        if (name.trim() === '') {
          return { ...stop, customName: null };
        }
        return stop;
      }));
    }
    
    setError(null);
    setEditMode(!editMode);
  };

  const refreshBusStop = async (stopCode) => {
    if (!apiKey) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/bus-arrival?busStopCode=${stopCode}&apiKey=${encodeURIComponent(apiKey)}`
      );

      if (!response.ok) {
        console.error(`Failed to refresh bus stop ${stopCode}`);
        return;
      }

      const data = await response.json();
      
      // Update the specific bus stop data
      setBusStops(prev => prev.map(stop => 
        stop.code === stopCode 
          ? { ...stop, data: data, timestamp: new Date() }
          : stop
      ));
    } catch (err) {
      console.error(`Error refreshing bus stop ${stopCode}:`, err);
    }
  };

  const refreshAllBusStops = async () => {
    if (busStops.length === 0) return;
    
    // Refresh all bus stops in parallel
    await Promise.all(
      busStops.map(stop => refreshBusStop(stop.code))
    );
  };

  useEffect(() => {
    // Set up interval to refresh all bus stops every 25 seconds
    if (busStops.length === 0) return;

    const intervalId = setInterval(() => {
      refreshAllBusStops();
    }, 25000);

    return () => clearInterval(intervalId);
  }, [busStops.length, apiKey]);

  // Save bus stops to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('busStops', JSON.stringify(busStops));
    } catch (error) {
      console.error('Error saving bus stops to localStorage:', error);
    }
  }, [busStops]);

  const formatTime = (timeString) => {
    if (!timeString) return null;
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = date - now;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Arr';
    return diffMins;
  };

  const getLoadPercentage = (load) => {
    switch (load) {
      case 'SEA': return 30;
      case 'SDA': return 70;
      case 'LSD': return 95;
      default: return 0;
    }
  };

  const getLoadColor = (load) => {
    switch (load) {
      case 'SEA': return '#4ade80'; // Green - Seats Available
      case 'SDA': return '#fbbf24'; // Yellow - Standing Available
      case 'LSD': return '#ef4444'; // Red - Limited Standing
      default: return '#2a2a2a'; // Gray - No data
    }
  };

  const hasAllBuses = (service) => {
    return service.NextBus?.EstimatedArrival && 
           service.NextBus2?.EstimatedArrival && 
           service.NextBus3?.EstimatedArrival;
  };

  const getBusType = (service) => {
    // Check if any of the buses are double decker
    const isDoubleDecker = service.NextBus?.Type === 'DD' || 
                          service.NextBus2?.Type === 'DD' || 
                          service.NextBus3?.Type === 'DD';
    return isDoubleDecker ? 'double-decker' : 'single-decker';
  };

  const getBusImage = (bus) => {
    if (!bus || !bus.Type) return 'single-decker';
    return bus.Type === 'DD' ? 'double-decker' : 'single-decker';
  };

  const getTimingColor = (bus) => {
    if (!bus || !bus.EstimatedArrival) return '#fff';
    
    // Check if bus is arriving (< 1 minute)
    const date = new Date(bus.EstimatedArrival);
    const now = new Date();
    const diffMs = date - now;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '#4ade80';
    
    if (bus.Monitored === undefined) return '#fff';
    return bus.Monitored === 1 || bus.Monitored === '1' ? '#fff' : '#ff4444';
  };

  const getLoadLevel = (load) => {
    switch (load) {
      case 'SEA': return 'Seats Available';
      case 'SDA': return 'Standing Available';
      case 'LSD': return 'Limited Standing';
      default: return 'N/A';
    }
  };

  return (
    <div className="App">

      <div className="container">

        <div className="search-section">
          <input
            id="busStop"
            type="text"
            value={busStopCode}
            onChange={(e) => setBusStopCode(e.target.value)}
            placeholder="Enter bus stop code"
          />
          <button onClick={fetchBusArrival} disabled={loading || !apiKey}>
            {loading ? 'Loading...' : 'Get Bus Arrival'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {busStops.length > 0 && (
          <div className="results">
            <div className="accordion-list">
              {busStops.map((busStop) => (
                <div key={busStop.code} className="accordion-item">
                  <div 
                    className="accordion-header" 
                    onClick={() => toggleAccordion(busStop.code)}
                  >
                    <div className="accordion-title">
                      {editMode ? (
                        <div className="edit-name-container">
                          <input
                            type="text"
                            className="edit-name-input"
                            value={busStop.customName !== null && busStop.customName !== undefined 
                              ? busStop.customName 
                              : (busStop.originalName || busStop.data.BusStopName || '')}
                            onChange={(e) => updateBusStopName(busStop.code, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Bus stop name"
                          />
                        </div>
                      ) : (
                        <span className="busstop-name">
                          {busStop.customName || busStop.originalName || busStop.data.BusStopName || 'Bus Stop'}
                        </span>
                      )}
                      <span className="bus-stop-code">{busStop.code}</span>
                    </div>
                    <div className="accordion-actions">
                      {editMode && (
                        <button 
                          className="remove-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBusStop(busStop.code);
                          }}
                        >
                          ✕
                        </button>
                      )}
                      <span className={`accordion-icon ${expandedStops[busStop.code] ? 'expanded' : ''}`}>
                        ▼
                      </span>
                    </div>
                  </div>
                  
                  {expandedStops[busStop.code] && (
                    <div className="accordion-content">
                      {busStop.data.Services && busStop.data.Services.length > 0 ? (
                        <div className="bus-list">
                          {[...busStop.data.Services].sort((a, b) => {
                            const numA = parseInt(a.ServiceNo);
                            const numB = parseInt(b.ServiceNo);
                            return numA - numB;
                          }).map((service, index) => (
                            <div key={index} className="bus-card">
                              <div className="bus-left">
                                <div className="bus-number">{service.ServiceNo}</div>
                              </div>
                              
                              <div className="bus-right">
                                <div className="timing-row">
                                  <div className="timing-item">
                                    <div className="timing-content">
                                      <div 
                                        className="timing-value"
                                        style={{color: getTimingColor(service.NextBus)}}
                                      >
                                        {formatTime(service.NextBus?.EstimatedArrival) || '-'}
                                      </div>
                                      {service.NextBus?.EstimatedArrival && (
                                        <img 
                                          src={`/${getBusImage(service.NextBus)}.png`} 
                                          alt="bus"
                                          className="timing-bus-icon"
                                        />
                                      )}
                                    </div>
                                    <div className="timing-bar">
                                      <div 
                                        className="timing-bar-fill" 
                                        style={{
                                          width: `${getLoadPercentage(service.NextBus?.Load)}%`,
                                          background: getLoadColor(service.NextBus?.Load)
                                        }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="timing-item">
                                    <div className="timing-content">
                                      <div 
                                        className="timing-value"
                                        style={{color: getTimingColor(service.NextBus2)}}
                                      >
                                        {formatTime(service.NextBus2?.EstimatedArrival) || '-'}
                                      </div>
                                      {service.NextBus2?.EstimatedArrival && (
                                        <img 
                                          src={`/${getBusImage(service.NextBus2)}.png`} 
                                          alt="bus"
                                          className="timing-bus-icon"
                                        />
                                      )}
                                    </div>
                                    <div className="timing-bar">
                                      <div 
                                        className="timing-bar-fill" 
                                        style={{
                                          width: `${getLoadPercentage(service.NextBus2?.Load)}%`,
                                          background: getLoadColor(service.NextBus2?.Load)
                                        }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="timing-item">
                                    <div className="timing-content">
                                      <div 
                                        className="timing-value"
                                        style={{color: getTimingColor(service.NextBus3)}}
                                      >
                                        {formatTime(service.NextBus3?.EstimatedArrival) || '-'}
                                      </div>
                                      {service.NextBus3?.EstimatedArrival && (
                                        <img 
                                          src={`/${getBusImage(service.NextBus3)}.png`} 
                                          alt="bus"
                                          className="timing-bus-icon"
                                        />
                                      )}
                                    </div>
                                    <div className="timing-bar">
                                      <div 
                                        className="timing-bar-fill" 
                                        style={{
                                          width: `${getLoadPercentage(service.NextBus3?.Load)}%`,
                                          background: getLoadColor(service.NextBus3?.Load)
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-data">No bus services available at this stop</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {busStops.length > 0 && (
          <button 
            className="floating-edit-button"
            onClick={toggleEditMode}
          >
            {editMode ? '✓' : '✏️'}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
