import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import TicketView from "./components/TicketView";
import PublicDisplay from "./components/PublicDisplay";
import Statistics from "./components/Statistics";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [userData, setUserData] = useState(null);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login setUserData={setUserData} />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute userData={userData}>
                <Dashboard userData={userData} />
              </ProtectedRoute>
            } 
          />
          <Route path="/ticket/:id" element={<TicketView />} />
          <Route path="/public-display" element={<PublicDisplay />} />
          <Route 
            path="/statistics" 
            element={
              <ProtectedRoute userData={userData}>
                <Statistics userData={userData} />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
