import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext.jsx';
import { Activity, Plus, LogOut, User, Users, Clipboard, Info, AlertTriangle, ActivitySquare, HeartPulse, FolderOpen, Edit3, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import FileUpload from '../components/FileUpload.jsx';
import MedicalTimeline from '../components/MedicalTimeline.jsx';
import DocumentHistory from '../components/DocumentHistory.jsx';
import QaChat from '../components/QaChat.jsx';
import InsightCards from '../components/InsightCards.jsx';
import TrendCharts from '../components/TrendCharts.jsx';

const Dashboard = () => {
  const { user, logoutUser } = useAuth();
  
  // State variables
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [insights, setInsights] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('Male');
  const [editPatientName, setEditPatientName] = useState('');
  const [editPatientAge, setEditPatientAge] = useState('');
  const [editPatientGender, setEditPatientGender] = useState('Male');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Fetch patient profiles on load
  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      const res = await api.get('/patients');
      setPatients(res.data.data);
      if (res.data.data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching patients:', err.message);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Fetch patient clinical logs (Timeline & Insights) when selection changes
  const fetchPatientDetails = async (id) => {
    if (!id) return;
    setLoadingTimeline(true);
    try {
      // Find patient profile object
      const patientObj = patients.find(p => p.id === id);
      setSelectedPatient(patientObj);

      // Fetch Timeline
      const timelineRes = await api.get(`/timeline/${id}`);
      setTimeline(timelineRes.data.data);

      // Fetch AI Insights
      const insightsRes = await api.get(`/insights/${id}`);
      setInsights(insightsRes.data.data);

      // Fetch Documents list
      try {
        setLoadingDocuments(true);
        const docsRes = await api.get(`/documents/${id}`);
        setDocuments(docsRes.data.data);
      } catch (docErr) {
        console.error('Error fetching patient documents:', docErr.message);
      } finally {
        setLoadingDocuments(false);
      }
    } catch (err) {
      console.error('Error fetching patient details:', err.message);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    } else {
      setSelectedPatient(null);
      setTimeline([]);
      setInsights([]);
      setDocuments([]);
    }
  }, [selectedPatientId, patients]);

  // Create Patient submission
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!newPatientName) return;

    try {
      const res = await api.post('/patients', {
        patient_name: newPatientName,
        age: parseInt(newPatientAge) || null,
        gender: newPatientGender
      });
      
      const created = res.data.data;
      setPatients(prev => [...prev, created]);
      setSelectedPatientId(created.id);
      
      // Reset form & close
      setNewPatientName('');
      setNewPatientAge('');
      setNewPatientGender('Male');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating patient:', err.message);
    }
  };

  // Open Edit Profile modal with prefilled data
  const handleOpenEditModal = () => {
    if (!selectedPatient) return;
    setEditPatientName(selectedPatient.patient_name);
    setEditPatientAge(selectedPatient.age || '');
    setEditPatientGender(selectedPatient.gender || 'Male');
    setShowEditModal(true);
  };

  // Submit Patient update
  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !editPatientName) return;
    try {
      const res = await api.put(`/patients/${selectedPatientId}`, {
        patient_name: editPatientName,
        age: parseInt(editPatientAge) || null,
        gender: editPatientGender
      });
      
      const updated = res.data.data;
      // Update local state list and current patient details
      setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedPatient(updated);
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating patient:', err.message);
    }
  };

  // Delete Patient and reset
  const handleDeletePatient = async () => {
    if (!selectedPatientId) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete the medical profile of "${selectedPatient.patient_name}"?\n\nThis action is irreversible and will delete all associated prescriptions, timelines, charts, and RAG data.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/patients/${selectedPatientId}`);
      const updatedPatients = patients.filter(p => p.id !== selectedPatientId);
      setPatients(updatedPatients);
      
      // Select another patient or clear selection
      const nextSelectedId = updatedPatients.length > 0 ? updatedPatients[0].id : null;
      setSelectedPatientId(nextSelectedId);
      if (!nextSelectedId) {
        setSelectedPatient(null);
        setTimeline([]);
        setInsights([]);
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error deleting patient:', err.message);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Collapse Toggle Arrow */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        style={{
          position: 'fixed',
          left: sidebarCollapsed ? '12px' : '246px',
          top: '20px',
          zIndex: 100,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s ease',
          color: 'var(--color-primary)'
        }}
        title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Sidebar Navigation */}
      <div 
        className="sidebar"
        style={{
          transform: sidebarCollapsed ? 'translateX(-260px)' : 'translateX(0)',
          transition: 'transform 0.3s ease'
        }}
      >
        <div className="sidebar-header">
          <HeartPulse size={28} style={{ color: 'var(--color-primary)' }} />
          <h2 className="sidebar-title" style={{ color: 'var(--color-primary)' }}>MedAI</h2>
        </div>

        <div className="sidebar-nav">
          <div className="patient-list-header">Patient Profiles</div>
          
          {loadingPatients ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div className="spinner-primary" style={{ width: '20px', height: '20px' }}></div>
            </div>
          ) : patients.length === 0 ? (
            <div style={{ padding: '0 12px', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              No profiles created yet.
            </div>
          ) : (
            patients.map(p => (
              <div
                key={p.id}
                className={`patient-item ${selectedPatientId === p.id ? 'active' : ''}`}
                onClick={() => setSelectedPatientId(p.id)}
              >
                <User size={16} />
                <span>{p.patient_name}</span>
              </div>
            ))
          )}

          <button 
            className="btn-secondary" 
            style={{ width: '100%', marginTop: '10px' }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>New Profile</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{user?.name || 'Practitioner'}</span>
              <span className="user-email">{user?.email || 'admin@hospital.com'}</span>
            </div>
            <button className="logout-btn" onClick={logoutUser} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Space */}
      <div 
        className="main-content"
        style={{
          marginLeft: sidebarCollapsed ? 'auto' : '260px',
          marginRight: sidebarCollapsed ? 'auto' : '0',
          transition: 'margin-left 0.3s ease, margin-right 0.3s ease',
          padding: sidebarCollapsed ? '40px 60px' : '40px'
        }}
      >
        {!selectedPatient ? (
          <div className="empty-state">
            <span className="empty-icon">📂</span>
            <h2 className="empty-title">Select or Create a Patient</h2>
            <p className="empty-desc">
              To begin parsing medical documents and analyzing historical charts, select an existing patient or create a new profile.
            </p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} />
              <span>Create Patient Profile</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Patient Header Block */}
            <div className="profile-header-card">
              <div>
                <h1 className="profile-title">{selectedPatient.patient_name}</h1>
                <div className="profile-meta-text">
                  <span>Age: {selectedPatient.age ? `${selectedPatient.age} years` : 'N/A'}</span>
                  <span>•</span>
                  <span>Gender: {selectedPatient.gender || 'N/A'}</span>
                  <span>•</span>
                  <span>ID: #{selectedPatient.id}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '8px 12px', 
                    fontSize: '13px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'var(--transition-fast)'
                  }}
                  className="btn-glass-hover"
                  onClick={handleOpenEditModal}
                >
                  <Edit3 size={14} style={{ color: 'white' }} />
                  <span style={{ color: 'white' }}>Edit Profile</span>
                </button>
                <button 
                  className="logout-btn" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px', border: '1px solid #fee2e2', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                  onClick={handleDeletePatient}
                >
                  <Trash2 size={14} />
                  <span>Delete Profile</span>
                </button>
                <Activity size={32} style={{ opacity: 0.8 }} />
              </div>
            </div>

            {/* Split dashboard workspace */}
            <div className="dashboard-grid">
              
              {/* Left Column: Timeline and Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* File Upload Zone */}
                <div className="dashboard-card">
                  <h3 className="card-title">
                    <Clipboard size={18} style={{ color: 'var(--color-primary)' }} />
                    <span>Upload Medical Records</span>
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                    Upload prescriptions, lab reports, or discharge summaries (PDF or Image formats).
                  </p>
                  <FileUpload 
                    patientId={selectedPatientId} 
                    onUploadSuccess={() => fetchPatientDetails(selectedPatientId)} 
                  />
                </div>

                {/* Uploaded Documents History */}
                <div className="dashboard-card">
                  <h3 className="card-title">
                    <FolderOpen size={18} style={{ color: 'var(--color-primary)' }} />
                    <span>Uploaded Medical Files</span>
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    Click on a ready record to view its original scanned document/prescription.
                  </p>
                  <DocumentHistory documents={documents} loading={loadingDocuments} />
                </div>

                {/* Patient Historical Timeline */}
                <div className="dashboard-card">
                  <h3 className="card-title">
                    <ActivitySquare size={18} style={{ color: 'var(--color-primary)' }} />
                    <span>Clinical History Timeline</span>
                  </h3>
                  
                  {loadingTimeline ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                      <div className="spinner-primary"></div>
                    </div>
                  ) : (
                    <MedicalTimeline timeline={timeline} />
                  )}
                </div>

              </div>

              {/* Right Column: AI Analytics & Q&A Assistant */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* AI Security & Clinical Insights */}
                <div className="dashboard-card">
                  <h3 className="card-title">
                    <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                    <span>AI Safety & Vitals Alerts</span>
                  </h3>
                  <InsightCards insights={insights} />
                </div>

                {/* Vitals Trend Visual Graphs */}
                <div className="dashboard-card">
                  <h3 className="card-title">
                    <Activity size={18} style={{ color: 'var(--color-secondary)' }} />
                    <span>Health Metric Trends</span>
                  </h3>
                  <TrendCharts timeline={timeline} />
                </div>

                {/* RAG-based Conversational QA Engine */}
                <div className="dashboard-card">
                  <h3 className="card-title">
                    <Info size={18} style={{ color: 'var(--color-primary)' }} />
                    <span>Evidence-based Clinical Assistant</span>
                  </h3>
                  <QaChat patientId={selectedPatientId} />
                </div>

              </div>

            </div>
          </div>
        )}
      </div>

      {/* Create Patient Profile Modal Overlay */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>Create Patient Profile</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreatePatient}>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Priya Sharma"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 35"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-input"
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1 }}
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>Edit Patient Profile</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleUpdatePatient}>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Priya Sharma"
                  value={editPatientName}
                  onChange={(e) => setEditPatientName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 35"
                    value={editPatientAge}
                    onChange={(e) => setEditPatientAge(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-input"
                    value={editPatientGender}
                    onChange={(e) => setEditPatientGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1 }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
