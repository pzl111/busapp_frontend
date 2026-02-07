import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [busStopCode, setBusStopCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedBusStop, setSelectedBusStop] = useState(null);
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
  const [editMode, setEditMode] = useState(false);
  const [favoriteBuses, setFavoriteBuses] = useState(() => {
    // Load favorite buses from localStorage on initial render
    try {
      const savedFavorites = localStorage.getItem('favoriteBuses');
      if (savedFavorites) {
        return JSON.parse(savedFavorites);
      }
    } catch (error) {
      console.error('Error loading favorite buses from localStorage:', error);
    }
    return [];
  });
  const [itemsOrder, setItemsOrder] = useState(() => {
    // Load items order from localStorage on initial render
    try {
      const savedOrder = localStorage.getItem('itemsOrder');
      if (savedOrder) {
        return JSON.parse(savedOrder);
      }
    } catch (error) {
      console.error('Error loading items order from localStorage:', error);
    }
    return [];
  });

  const fetchBusArrival = async () => {
    if (!apiKey) {
      setError('Please enter your LTA DataMall API key');
      return;
    }

    if (!busStopCode) {
      setError('Please enter a bus stop code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/bus-arrival?busStopCode=${busStopCode}&apiKey=${encodeURIComponent(apiKey)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Set search result
      setSearchResult({
        code: busStopCode,
        data: data,
        customName: null,
        originalName: data.BusStopName,
        timestamp: new Date()
      });
      setShowOverlay(true);
    } catch (err) {
      setError(err.message);
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveBusStop = () => {
    const busStop = searchResult || selectedBusStop;
    if (!busStop) return;
    
    // Check if bus stop already exists
    const existingIndex = busStops.findIndex(stop => stop.code === busStop.code);
    if (existingIndex !== -1) {
      // Remove from saved stops
      setBusStops(prev => prev.filter(stop => stop.code !== busStop.code));
      // If we're viewing a saved bus stop and we just removed it, close the overlay
      if (selectedBusStop && existingIndex !== -1) {
        closeBusStopDetails();
      }
    } else {
      // Add to saved stops
      setBusStops(prev => [...prev, busStop]);
    }
  };

  const isBusStopSaved = (busStopCode) => {
    return busStops.some(stop => stop.code === busStopCode);
  };

  const closeOverlay = () => {
    setShowOverlay(false);
    setSearchResult(null);
    setBusStopCode('');
    setError(null);
  };

  const openBusStopDetails = (busStop) => {
    setSelectedBusStop(busStop);
  };

  const closeBusStopDetails = () => {
    setSelectedBusStop(null);
  };

  const removeBusStop = (code) => {
    setBusStops(prev => prev.filter(stop => stop.code !== code));
  };

  const toggleFavoriteBus = (busStopCode, serviceNo, busStopName, serviceData = null) => {
    setFavoriteBuses(prev => {
      const existingIndex = prev.findIndex(
        fav => fav.busStopCode === busStopCode && fav.serviceNo === serviceNo
      );
      
      if (existingIndex !== -1) {
        // Remove from favorites
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // Add to favorites
        return [...prev, {
          busStopCode,
          serviceNo,
          busStopName,
          customName: null,
          data: serviceData,
          timestamp: new Date()
        }];
      }
    });
  };

  const isBusFavorited = (busStopCode, serviceNo) => {
    return favoriteBuses.some(
      fav => fav.busStopCode === busStopCode && fav.serviceNo === serviceNo
    );
  };

  const removeFavoriteBus = (busStopCode, serviceNo) => {
    setFavoriteBuses(prev => prev.filter(
      fav => !(fav.busStopCode === busStopCode && fav.serviceNo === serviceNo)
    ));
  };

  const updateFavoriteBusName = (busStopCode, serviceNo, newName) => {
    setFavoriteBuses(prev => prev.map(fav => 
      fav.busStopCode === busStopCode && fav.serviceNo === serviceNo
        ? { ...fav, customName: newName }
        : fav
    ));
  };

  const updateBusStopName = (code, newName) => {
    setBusStops(prev => prev.map(stop => 
      stop.code === code 
        ? { ...stop, customName: newName }
        : stop
    ));
  };

  const moveItemUp = (itemId) => {
    const index = itemsOrder.indexOf(itemId);
    if (index <= 0) return; // Already at the top
    
    const newOrder = [...itemsOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setItemsOrder(newOrder);
  };

  const moveItemDown = (itemId) => {
    const index = itemsOrder.indexOf(itemId);
    if (index === -1 || index >= itemsOrder.length - 1) return; // Already at the bottom
    
    const newOrder = [...itemsOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setItemsOrder(newOrder);
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
        `${process.env.REACT_APP_BACKEND_URL}/api/bus-arrival?busStopCode=${stopCode}&apiKey=${encodeURIComponent(apiKey)}`
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

      // Update favorite buses from this stop
      setFavoriteBuses(prev => prev.map(fav => {
        if (fav.busStopCode === stopCode) {
          const service = data.Services?.find(s => s.ServiceNo === fav.serviceNo);
          return {
            ...fav,
            data: service || null,
            busStopName: data.BusStopName || fav.busStopName,
            timestamp: new Date()
          };
        }
        return fav;
      }));

      // Update selected bus stop if viewing
      if (selectedBusStop?.code === stopCode) {
        setSelectedBusStop(prev => ({
          ...prev,
          data: data,
          timestamp: new Date()
        }));
      }
    } catch (err) {
      console.error(`Error refreshing bus stop ${stopCode}:`, err);
    }
  };

  const refreshAllBusStops = async () => {
    // Get unique bus stop codes from both saved stops and favorite buses
    const busStopCodes = new Set([
      ...busStops.map(stop => stop.code),
      ...favoriteBuses.map(fav => fav.busStopCode)
    ]);
    
    if (busStopCodes.size === 0) return;
    
    // Refresh all bus stops in parallel
    await Promise.all(
      Array.from(busStopCodes).map(code => refreshBusStop(code))
    );
  };

  useEffect(() => {
    // Refresh all bus stops on initial page load/refresh
    if ((busStops.length > 0 || favoriteBuses.length > 0) && apiKey) {
      refreshAllBusStops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    // Set up interval to refresh all bus stops every 25 seconds
    if (busStops.length === 0 && favoriteBuses.length === 0) return;

    const intervalId = setInterval(() => {
      refreshAllBusStops();
    }, 25000);

    return () => clearInterval(intervalId);
  }, [busStops.length, favoriteBuses.length, apiKey]);

  // Save bus stops to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('busStops', JSON.stringify(busStops));
    } catch (error) {
      console.error('Error saving bus stops to localStorage:', error);
    }
  }, [busStops]);

  // Save favorite buses to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('favoriteBuses', JSON.stringify(favoriteBuses));
    } catch (error) {
      console.error('Error saving favorite buses to localStorage:', error);
    }
  }, [favoriteBuses]);

  // Save items order to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('itemsOrder', JSON.stringify(itemsOrder));
    } catch (error) {
      console.error('Error saving items order to localStorage:', error);
    }
  }, [itemsOrder]);

  // Sync itemsOrder when busStops or favoriteBuses change
  useEffect(() => {
    const allItemIds = [
      ...busStops.map(stop => `busStop-${stop.code}`),
      ...favoriteBuses.map(fav => `favoriteBus-${fav.busStopCode}-${fav.serviceNo}`)
    ];
    
    // Remove items that no longer exist
    const filteredOrder = itemsOrder.filter(item => allItemIds.includes(item));
    
    // Add new items that aren't in the order yet
    const newItems = allItemIds.filter(id => !filteredOrder.includes(id));
    
    if (newItems.length > 0 || filteredOrder.length !== itemsOrder.length) {
      setItemsOrder([...filteredOrder, ...newItems]);
    }
  }, [busStops, favoriteBuses]);

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

  return (
    <div className="App">
      {selectedBusStop && (
        <div className="search-overlay">
          <div className="overlay-header">
            <button className="back-button" onClick={closeBusStopDetails}>
              ◀
            </button>
            <div className="overlay-bus-stop-info">
              <span className="busstop-name">
                {selectedBusStop.customName || selectedBusStop.originalName || selectedBusStop.data.BusStopName || 'Bus Stop'}
              </span>
              <span className="bus-stop-code">{selectedBusStop.code}</span>
            </div>
            <button 
              className={`save-stop-button ${isBusStopSaved(selectedBusStop.code) ? 'saved' : ''}`}
              onClick={toggleSaveBusStop}
            >
              {isBusStopSaved(selectedBusStop.code) ? '★' : '☆'}
            </button>
          </div>
          
          <div className="overlay-content">
            
            {selectedBusStop.data.Services && selectedBusStop.data.Services.length > 0 ? (
              <div className="bus-list">
                {[...selectedBusStop.data.Services].sort((a, b) => {
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
                    
                    <button 
                      className={`favorite-bus-button ${isBusFavorited(selectedBusStop.code, service.ServiceNo) ? 'favorited' : ''}`}
                      onClick={() => toggleFavoriteBus(
                        selectedBusStop.code, 
                        service.ServiceNo,
                        selectedBusStop.customName || selectedBusStop.originalName || selectedBusStop.data.BusStopName,
                        service
                      )}
                    >
                      {isBusFavorited(selectedBusStop.code, service.ServiceNo) ? '★' : '☆'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">No bus services available at this stop</div>
            )}
          </div>
        </div>
      )}

      {showOverlay && searchResult && (
        <div className="search-overlay">
          <div className="overlay-header">
            <button className="back-button" onClick={closeOverlay}>
              ←
            </button>
            <div className="overlay-bus-stop-info">
              <span className="busstop-name">
                {searchResult.data.BusStopName || 'Bus Stop'}
              </span>
              <span className="bus-stop-code">{searchResult.code}</span>
            </div>
            <button 
              className={`save-stop-button ${isBusStopSaved(searchResult.code) ? 'saved' : ''}`}
              onClick={toggleSaveBusStop}
            >
              {isBusStopSaved(searchResult.code) ? '★' : '☆'}
            </button>
          </div>
          
          <div className="overlay-content">
            {error && <div className="error">{error}</div>}
            
            {searchResult.data.Services && searchResult.data.Services.length > 0 ? (
              <div className="bus-list">
                {[...searchResult.data.Services].sort((a, b) => {
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
                    
                    <button 
                      className={`favorite-bus-button ${isBusFavorited(searchResult.code, service.ServiceNo) ? 'favorited' : ''}`}
                      onClick={() => toggleFavoriteBus(
                        searchResult.code, 
                        service.ServiceNo,
                        searchResult.data.BusStopName,
                        service
                      )}
                    >
                      {isBusFavorited(searchResult.code, service.ServiceNo) ? '★' : '☆'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">No bus services available at this stop</div>
            )}
          </div>
        </div>
      )}

      <div className="container">
        <div className="search-section">
          <input
            id="busStop"
            type="text"
            value={busStopCode}
            onChange={(e) => setBusStopCode(e.target.value)}
            placeholder="Enter bus stop code"
            onKeyPress={(e) => e.key === 'Enter' && fetchBusArrival()}
          />
          <button className="search-icon-button" onClick={fetchBusArrival} disabled={loading || !apiKey}>
            <img src="/search.png" alt="search" className="search-icon" />
          </button>
        </div>

        {!showOverlay && error && <div className="error">{error}</div>}

        {(busStops.length > 0 || favoriteBuses.length > 0) && (
          <div className="combined-items-section">
            {/* <h2 className="saved-stops-title">My Buses & Stops</h2> */}
            <div className="combined-items-list">
              {itemsOrder.map((itemId, index) => {
                const [type, ...idParts] = itemId.split('-');
                
                if (type === 'favoriteBus') {
                  const busStopCode = idParts[0];
                  const serviceNo = idParts.slice(1).join('-');
                  const favorite = favoriteBuses.find(
                    fav => fav.busStopCode === busStopCode && fav.serviceNo === serviceNo
                  );
                  
                  if (!favorite) return null;
                  
                  return (
                    <div
                      key={itemId}
                      className="bus-card favorite-bus-card"
                    >
                      {editMode && (
                        <div className="reorder-buttons">
                          <button 
                            className="reorder-button"
                            onClick={() => moveItemUp(itemId)}
                            disabled={index === 0}
                          >
                            ▲
                          </button>
                          <button 
                            className="reorder-button"
                            onClick={() => moveItemDown(itemId)}
                            disabled={index === itemsOrder.length - 1}
                          >
                            ▼
                          </button>
                        </div>
                      )}
                      {editMode ? (
                        <>
                          <div className="bus-number-edit">{favorite.serviceNo}</div>
                          <input
                            type="text"
                            className="bus-destination-input-edit"
                            value={favorite.customName !== null && favorite.customName !== undefined 
                              ? favorite.customName 
                              : favorite.busStopName || favorite.busStopCode}
                            onChange={(e) => updateFavoriteBusName(favorite.busStopCode, favorite.serviceNo, e.target.value)}
                            placeholder="Bus stop name"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </>
                      ) : (
                        <div className="bus-left">
                          <div className="bus-number">{favorite.serviceNo}</div>
                          <div className="bus-destination">
                            {favorite.customName || favorite.busStopName || favorite.busStopCode}
                          </div>
                        </div>
                      )}
                      
                      {!editMode && favorite.data && (
                        <div className="bus-right">
                          <div className="timing-row">
                            <div className="timing-item">
                              <div className="timing-content">
                                <div 
                                  className="timing-value"
                                  style={{color: getTimingColor(favorite.data.NextBus)}}
                                >
                                  {formatTime(favorite.data.NextBus?.EstimatedArrival) || '-'}
                                </div>
                                {favorite.data.NextBus?.EstimatedArrival && (
                                  <img 
                                    src={`/${getBusImage(favorite.data.NextBus)}.png`} 
                                    alt="bus"
                                    className="timing-bus-icon"
                                  />
                                )}
                              </div>
                              <div className="timing-bar">
                                <div 
                                  className="timing-bar-fill" 
                                  style={{
                                    width: `${getLoadPercentage(favorite.data.NextBus?.Load)}%`,
                                    background: getLoadColor(favorite.data.NextBus?.Load)
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="timing-item">
                              <div className="timing-content">
                                <div 
                                  className="timing-value"
                                  style={{color: getTimingColor(favorite.data.NextBus2)}}
                                >
                                  {formatTime(favorite.data.NextBus2?.EstimatedArrival) || '-'}
                                </div>
                                {favorite.data.NextBus2?.EstimatedArrival && (
                                  <img 
                                    src={`/${getBusImage(favorite.data.NextBus2)}.png`} 
                                    alt="bus"
                                    className="timing-bus-icon"
                                  />
                                )}
                              </div>
                              <div className="timing-bar">
                                <div 
                                  className="timing-bar-fill" 
                                  style={{
                                    width: `${getLoadPercentage(favorite.data.NextBus2?.Load)}%`,
                                    background: getLoadColor(favorite.data.NextBus2?.Load)
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="timing-item">
                              <div className="timing-content">
                                <div 
                                  className="timing-value"
                                  style={{color: getTimingColor(favorite.data.NextBus3)}}
                                >
                                  {formatTime(favorite.data.NextBus3?.EstimatedArrival) || '-'}
                                </div>
                                {favorite.data.NextBus3?.EstimatedArrival && (
                                  <img 
                                    src={`/${getBusImage(favorite.data.NextBus3)}.png`} 
                                    alt="bus"
                                    className="timing-bus-icon"
                                  />
                                )}
                              </div>
                              <div className="timing-bar">
                                <div 
                                  className="timing-bar-fill" 
                                  style={{
                                    width: `${getLoadPercentage(favorite.data.NextBus3?.Load)}%`,
                                    background: getLoadColor(favorite.data.NextBus3?.Load)
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                  
                      {editMode && (
                        <button 
                          className="remove-button"
                          onClick={() => removeFavoriteBus(favorite.busStopCode, favorite.serviceNo)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                } else if (type === 'busStop') {
                  const busStopCode = idParts.join('-');
                  const busStop = busStops.find(stop => stop.code === busStopCode);
                  
                  if (!busStop) return null;
                  
                  return (
                    <div
                      key={itemId}
                      className="bus-stop-item-compact"
                      onClick={() => !editMode && openBusStopDetails(busStop)}
                      style={{cursor: editMode ? 'default' : 'pointer'}}
                    >
                      {editMode && (
                        <div className="reorder-buttons">
                          <button 
                            className="reorder-button"
                            onClick={(e) => { e.stopPropagation(); moveItemUp(itemId); }}
                            disabled={index === 0}
                          >
                            ▲
                          </button>
                          <button 
                            className="reorder-button"
                            onClick={(e) => { e.stopPropagation(); moveItemDown(itemId); }}
                            disabled={index === itemsOrder.length - 1}
                          >
                            ▼
                          </button>
                        </div>
                      )}
                      <div className="bus-stop-compact-content">
                        {editMode ? (
                          <div className="edit-name-container">
                            <input
                              type="text"
                              className="edit-name-input"
                              value={busStop.customName !== null && busStop.customName !== undefined 
                                ? busStop.customName 
                                : (busStop.originalName || busStop.data.BusStopName || '')}
                              onChange={(e) => updateBusStopName(busStop.code, e.target.value)}
                              placeholder="Bus stop name"
                            />
                          </div>
                        ) : (
                          <div className="bus-stop-title">
                            <span className="busstop-name">
                              {busStop.customName || busStop.originalName || busStop.data.BusStopName || 'Bus Stop'}
                            </span>
                            <span className="bus-stop-code">{busStop.code}</span>
                          </div>
                        )}
                      </div>
                      {editMode && (
                        <button 
                          className="remove-button"
                          onClick={() => removeBusStop(busStop.code)}
                        >
                          ✕
                        </button>
                      )}
                      {!editMode && (
                        <span className="arrow-icon">▶</span>
                      )}
                    </div>
                  );
                }
                
                return null;
              })}
            </div>
          </div>
        )}

        {(busStops.length > 0 || favoriteBuses.length > 0) && (
          <button 
            className="floating-edit-button"
            onClick={toggleEditMode}
          >
            {editMode ? <img src="/tick.png" alt="tick" className="tick-icon" /> : <img src="/edit.png" alt="edit" className="edit-icon" />}
          </button>
        )}
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
}

export default App;
