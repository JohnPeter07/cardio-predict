import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc,
    addDoc, 
    updateDoc, 
    onSnapshot, 
    serverTimestamp,
    query
} from 'firebase/firestore';
// NOTE: To fix the compilation error, please run `npm install jspdf` in your terminal.
import { jsPDF } from 'jspdf';

// --- IMPORTANT: PASTE YOUR FIREBASE CONFIGURATION HERE ---
const firebaseConfig = {
  apiKey: "AIzaSyCqTW3g63EhY7RzHb-TP83dkW5zGKEGEsk",
  authDomain: "cardio-predict-966b4.firebaseapp.com",
  projectId: "cardio-predict-966b4",
  storageBucket: "cardio-predict-966b4.firebasestorage.app",
  messagingSenderId: "325590029622",
  appId: "1:325590029622:web:e1147029ae7f0743304f97",
  measurementId: "G-XF37THL175"
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Reusable UI Components ---

const Spinner = ({ isPageLoader = false }) => (
    <div className={isPageLoader 
        ? "fixed inset-0 bg-white flex items-center justify-center z-50" 
        : "flex items-center justify-center"}>
        <div className={isPageLoader
            ? "border-4 border-gray-200 w-9 h-9 border-t-blue-600 rounded-full animate-spin"
            : "border-4 border-white w-5 h-5 border-t-transparent rounded-full animate-spin"
        } />
    </div>
);

const AuthComponent = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('patient');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLoginView) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    email: email,
                    role: role,
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div id="authView" className="container mx-auto px-4 py-8">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-blue-600">Welcome to Cardio-AI Predict</h1>
                <p className="text-lg text-gray-600 mt-2">Your AI-Powered Heart Health Partner</p>
            </header>
            <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg mt-12">
                <h2 className="text-2xl font-semibold mb-6 text-center">{isLoginView ? 'Login' : 'Create Account'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" placeholder="you@example.com" required />
                        </div>
                        <div>
                            <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input id="auth-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" placeholder="min. 6 characters" required />
                        </div>
                        {!isLoginView && (
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">I am a:</label>
                                <select id="role" value={role} onChange={e => setRole(e.target.value)} className="form-input" required>
                                    <option value="patient">Patient</option>
                                    <option value="doctor">Doctor</option>
                                </select>
                            </div>
                        )}
                        {error && <p className="text-red-500 text-sm text-center h-4">{error}</p>}
                    </div>
                    <div className="mt-6">
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? <Spinner /> : (isLoginView ? 'Login' : 'Sign Up')}
                        </button>
                    </div>
                </form>
                <p className="text-center mt-4 text-sm">
                    {isLoginView ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => setIsLoginView(!isLoginView)} className="text-blue-600 hover:underline">
                        {isLoginView ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

const PatientFormComponent = ({ setPredictionResult }) => {
    const [bmi, setBmi] = useState('-');
    const handleBmiCalculation = useCallback(() => {
        const height = parseFloat(document.getElementById('p-height')?.value);
        const weight = parseFloat(document.getElementById('p-weight')?.value);
        if (height > 0 && weight > 0) setBmi((weight / ((height / 100) ** 2)).toFixed(1));
        else setBmi('-');
    }, []);

    const handlePatientSubmit = (e) => {
        e.preventDefault();
        let riskScore = 0;
        const data = {
            age: parseInt(e.target['p-age'].value), bmi: parseFloat(bmi), smoking: e.target.smoking.value === '1',
            hr: parseInt(e.target['p-hr'].value), bp: parseInt(e.target['p-bp'].value), activity: parseInt(e.target['p-activity'].value),
            problem: e.target['p-problem'].value, alcohol: e.target['p-alcohol'].value, bodyfat: parseFloat(e.target['p-bodyfat'].value),
            diet: e.target['p-diet'].value,
        };
        if (data.age > 50) riskScore += 20; if (data.bmi > 25) riskScore += 15; if (data.bmi > 30) riskScore += 10;
        if (data.smoking) riskScore += 20; if (data.hr > 90) riskScore += 10; if (data.bp > 130) riskScore += 15;
        if (data.bp > 140) riskScore += 10; if (data.activity < 2) riskScore += 10; if (data.alcohol === 'regular') riskScore += 15;
        if (data.bodyfat > 25) riskScore += 10; if (data.diet === 'junk') riskScore += 15;
        const riskPercentage = Math.min(Math.max(riskScore, 5), 95);
        setPredictionResult({ type: 'patient', percentage: riskPercentage, data });
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-6 text-center">General Health Assessment</h2>
            <form id="patientForm" onSubmit={handlePatientSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><h3 className="font-semibold text-gray-700 border-b pb-2">Personal Details</h3></div>
                <div><label htmlFor="p-age" className="block text-sm font-medium text-gray-700 mb-1">Age</label><input type="number" id="p-age" className="form-input" placeholder="e.g., 45" required /></div>
                <div><label htmlFor="p-gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label><select id="p-gender" className="form-input" required><option value="1">Male</option><option value="0">Female</option></select></div>
                <div><label htmlFor="p-height" className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label><input type="number" id="p-height" className="form-input" placeholder="e.g., 175" onChange={handleBmiCalculation} required /></div>
                <div><label htmlFor="p-weight" className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label><input type="number" id="p-weight" className="form-input" placeholder="e.g., 80" onChange={handleBmiCalculation} required /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Body Mass Index (BMI)</label><p className="text-lg font-bold text-blue-600">{bmi}</p></div>
                
                <div className="md:col-span-2 mt-4"><h3 className="font-semibold text-gray-700 border-b pb-2">Lifestyle Factors</h3></div>
                <div><label htmlFor="p-bodyfat" className="block text-sm font-medium text-gray-700 mb-1">Body Fat %</label><input type="number" id="p-bodyfat" className="form-input" placeholder="e.g., 22" required /></div>
                <div><label htmlFor="p-alcohol" className="block text-sm font-medium text-gray-700 mb-1">Alcohol Intake</label><select id="p-alcohol" className="form-input" required><option value="none">None</option><option value="social">Socially</option><option value="regular">Regularly (3+ times a week)</option></select></div>
                <div className="md:col-span-2"><label htmlFor="p-diet" className="block text-sm font-medium text-gray-700 mb-1">Primary Diet Style</label><select id="p-diet" className="form-input" required><option value="balanced">Balanced Diet</option><option value="low_carb">Low-Carb</option><option value="vegetarian">Vegetarian / Vegan</option><option value="junk">High in Processed/Junk Food</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Smoking Status</label><div className="flex space-x-4"><label><input type="radio" name="smoking" value="1" required /> Yes</label><label><input type="radio" name="smoking" value="0" defaultChecked /> No</label></div></div>
                <div><label htmlFor="p-activity" className="block text-sm font-medium text-gray-700 mb-1">Physical Activity</label><select id="p-activity" className="form-input" required><option value="0">Sedentary</option><option value="1">Lightly Active</option><option value="2">Moderately Active</option><option value="3">Very Active</option></select></div>

                <div className="md:col-span-2 mt-4"><h3 className="font-semibold text-gray-700 border-b pb-2">Health Concerns & Vitals</h3></div>
                <div className="md:col-span-2"><label htmlFor="p-problem" className="block text-sm font-medium text-gray-700 mb-1">Describe symptoms</label><textarea id="p-problem" rows="3" className="form-input" placeholder="e.g., Chest pain during exercise..."></textarea></div>
                <div><label htmlFor="p-hr" className="block text-sm font-medium text-gray-700 mb-1">Resting Heart Rate (bpm)</label><input type="number" id="p-hr" className="form-input" placeholder="e.g., 70" required /></div>
                <div><label htmlFor="p-bp" className="block text-sm font-medium text-gray-700 mb-1">Systolic Blood Pressure (mmHg)</label><input type="number" id="p-bp" className="form-input" placeholder="e.g., 120" required /></div>
                
                <div className="md:col-span-2 mt-4"><button type="submit" className="btn-primary">Predict My Risk</button></div>
            </form>
        </div>
    );
};

const DoctorFormComponent = ({ patient, backToDashboard, setPredictionResult }) => {
    const handleDoctorSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const patientDetails = {
            name: formData.get('d-name'), phone: formData.get('d-phone'),
            email: formData.get('d-email'), address: formData.get('d-address'),
        };
        const clinicalData = {
            age: parseInt(formData.get('d-age')), gender: parseInt(formData.get('d-gender')), cp: parseInt(formData.get('d-cp')),
            trestbps: parseInt(formData.get('d-trestbps')), chol: parseInt(formData.get('d-chol')), fbs: parseInt(formData.get('d-fbs')),
            restecg: parseInt(formData.get('d-restecg')), thalach: parseInt(formData.get('d-thalach')), exang: parseInt(formData.get('d-exang')),
            oldpeak: parseFloat(formData.get('d-oldpeak')), slope: parseInt(formData.get('d-slope')), ca: parseInt(formData.get('d-ca')),
            thal: parseInt(formData.get('d-thal')),
        };

        let score = 0; const factors = [];
        if (clinicalData.cp > 0) { score += (4 - clinicalData.cp) * 5; factors.push({ name: "Chest Pain Type", severity: "High" }); }
        if (clinicalData.exang === 1) { score += 15; factors.push({ name: "Exercise Induced Angina", severity: "High" }); }
        if (clinicalData.ca > 0) { score += clinicalData.ca * 7; factors.push({ name: `Fluoroscopy Vessels (${clinicalData.ca})`, severity: "High" }); }
        if (clinicalData.oldpeak > 1.5) { score += clinicalData.oldpeak * 5; factors.push({ name: `ST Depression (${clinicalData.oldpeak})`, severity: "Medium" }); }
        if (clinicalData.thal === 3) { score += 10; factors.push({ name: "Thalassemia (Reversible Defect)", severity: "High" }); }
        if (clinicalData.chol > 240) { score += (clinicalData.chol - 240) / 10; factors.push({ name: `High Cholesterol (${clinicalData.chol})`, severity: "Medium" }); }
        if (clinicalData.age > 55) { score += (clinicalData.age - 55) / 2; factors.push({ name: `Age (${clinicalData.age})`, severity: "Low" }); }
        if (clinicalData.thalach < (220 - clinicalData.age) * 0.75) { score += 5; factors.push({ name: `Low Max Heart Rate (${clinicalData.thalach})`, severity: "Low" }); }
        
        const percentage = Math.min(Math.round(score), 98);
        let diseaseType = "Coronary Artery Disease";
        if (percentage < 30) diseaseType = "Low Probability of Significant Disease";
        else if (clinicalData.cp === 1 && percentage < 50) diseaseType = "Possible Non-Ischemic Chest Pain";

        const patientRecord = {
            ...patientDetails,
            data: clinicalData,
            lastPrediction: { percentage, disease: diseaseType },
            updatedAt: serverTimestamp(),
        };

        if (patient) {
            await updateDoc(doc(db, 'patients', patient.id), patientRecord);
        } else {
            await addDoc(collection(db, 'patients'), { ...patientRecord, createdAt: serverTimestamp() });
        }
        setPredictionResult({ type: 'doctor', percentage, disease: diseaseType, factors });
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">{patient ? 'Edit Patient Data' : 'Add New Patient'}</h2>
                <button onClick={backToDashboard} className="btn-secondary">Back to Dashboard</button>
            </div>
            <form id="doctorForm" onSubmit={handleDoctorSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div className="md:col-span-3"><h3 className="font-semibold text-gray-700 border-b pb-2 mb-2">Patient Demographics</h3></div>
                <div><label htmlFor="d-name" className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label><input type="text" name="d-name" defaultValue={patient?.name} className="form-input" placeholder="e.g., John Doe" required /></div>
                <div><label htmlFor="d-age" className="block text-sm font-medium text-gray-700 mb-1">Age</label><input type="number" name="d-age" defaultValue={patient?.data?.age} className="form-input" placeholder="e.g., 52" required /></div>
                <div><label htmlFor="d-gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label><select name="d-gender" defaultValue={patient?.data?.gender ?? 1} className="form-input" required><option value="1">Male</option><option value="0">Female</option></select></div>
                <div><label htmlFor="d-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" name="d-phone" defaultValue={patient?.phone} className="form-input" placeholder="e.g., 555-0101" /></div>
                <div><label htmlFor="d-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="d-email" defaultValue={patient?.email} className="form-input" placeholder="e.g., name@email.com" /></div>
                <div className="md:col-span-3"><label htmlFor="d-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" name="d-address" defaultValue={patient?.address} className="form-input" placeholder="e.g., 123 Main St, Anytown" /></div>

                <div className="md:col-span-3 mt-4"><h3 className="font-semibold text-gray-700 border-b pb-2 mb-2">Clinical Data</h3></div>
                <div><label htmlFor="d-cp" className="block text-sm font-medium text-gray-700 mb-1">Chest Pain Type</label><select name="d-cp" defaultValue={patient?.data?.cp ?? 0} className="form-input" required><option value="0">Typical Angina</option><option value="1">Atypical Angina</option><option value="2">Non-anginal Pain</option><option value="3">Asymptomatic</option></select></div>
                <div><label htmlFor="d-trestbps" className="block text-sm font-medium text-gray-700 mb-1">Resting BP</label><input type="number" name="d-trestbps" defaultValue={patient?.data?.trestbps} className="form-input" placeholder="e.g., 130" required /></div>
                <div><label htmlFor="d-chol" className="block text-sm font-medium text-gray-700 mb-1">Cholesterol</label><input type="number" name="d-chol" defaultValue={patient?.data?.chol} className="form-input" placeholder="e.g., 210" required /></div>
                <div><label htmlFor="d-fbs" className="block text-sm font-medium text-gray-700 mb-1">Fasting BS {'>'} 120</label><select name="d-fbs" defaultValue={patient?.data?.fbs ?? 0} className="form-input" required><option value="1">Yes</option><option value="0">No</option></select></div>
                <div><label htmlFor="d-restecg" className="block text-sm font-medium text-gray-700 mb-1">Resting ECG</label><select name="d-restecg" defaultValue={patient?.data?.restecg ?? 0} className="form-input" required><option value="0">Normal</option><option value="1">ST-T Abnormality</option><option value="2">LVH</option></select></div>
                <div><label htmlFor="d-thalach" className="block text-sm font-medium text-gray-700 mb-1">Max Heart Rate</label><input type="number" name="d-thalach" defaultValue={patient?.data?.thalach} className="form-input" placeholder="e.g., 150" required /></div>
                <div><label htmlFor="d-exang" className="block text-sm font-medium text-gray-700 mb-1">Exercise Angina</label><select name="d-exang" defaultValue={patient?.data?.exang ?? 0} className="form-input" required><option value="1">Yes</option><option value="0">No</option></select></div>
                <div><label htmlFor="d-oldpeak" className="block text-sm font-medium text-gray-700 mb-1">ST Depression</label><input type="number" step="0.1" name="d-oldpeak" defaultValue={patient?.data?.oldpeak} className="form-input" placeholder="e.g., 1.8" required /></div>
                <div><label htmlFor="d-slope" className="block text-sm font-medium text-gray-700 mb-1">ST Slope</label><select name="d-slope" defaultValue={patient?.data?.slope ?? 0} className="form-input" required><option value="0">Upsloping</option><option value="1">Flat</option><option value="2">Downsloping</option></select></div>
                <div><label htmlFor="d-ca" className="block text-sm font-medium text-gray-700 mb-1">Major Vessels</label><select name="d-ca" defaultValue={patient?.data?.ca ?? 0} className="form-input" required><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>
                <div><label htmlFor="d-thal" className="block text-sm font-medium text-gray-700 mb-1">Thalassemia</label><select name="d-thal" defaultValue={patient?.data?.thal ?? 1} className="form-input" required><option value="1">Normal</option><option value="2">Fixed Defect</option><option value="3">Reversible Defect</option></select></div>
                <div className="md:col-span-3 mt-4"><button type="submit" className="btn-primary">Run Advanced Prediction</button></div>
            </form>
        </div>
    );
};

const PatientDetailsComponent = ({ patient, backToDashboard, editPatient }) => {
    if (!patient) return null;
    const dataEntries = Object.entries(patient.data || {}).map(([key, value]) => (
        `<div key=${key} class="flex justify-between py-2 border-b"><span class="text-gray-600 capitalize">${key.replace(/_/g, ' ')}</span><span class="font-semibold">${value}</span></div>`
    )).join('');
    return (
        <div className="max-w-5xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold">{patient.name}</h2>
                    <p className="text-gray-500 font-mono text-sm">{patient.id}</p>
                </div>
                <button className="btn-secondary" onClick={backToDashboard}>Back to Dashboard</button>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <h3 className="font-semibold text-lg mb-2">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                        <p><strong className="text-gray-600">Phone:</strong> {patient.phone || 'N/A'}</p>
                        <p><strong className="text-gray-600">Email:</strong> {patient.email || 'N/A'}</p>
                        <p><strong className="text-gray-600">Address:</strong> {patient.address || 'N/A'}</p>
                    </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <h3 className="font-semibold text-lg mb-2">Last Prediction Result</h3>
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <p className={`text-5xl font-bold ${patient.lastPrediction?.percentage > 60 ? 'text-red-500' : 'text-green-500'}`}>{patient.lastPrediction?.percentage || 'N/A'}%</p>
                            <p className="text-lg">{patient.lastPrediction?.disease || 'No prediction yet'}</p>
                        </div>
                        <button className="btn-primary mt-4 w-full" onClick={() => editPatient(patient)}>Edit Data & Run New Prediction</button>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Saved Clinical Data</h3>
                        <div className="text-sm" dangerouslySetInnerHTML={{ __html: dataEntries }}/>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PatientPredictionResultModal = ({ result, onClose }) => {
    if (!result) return null;
    const { percentage, data } = result;
    let riskLevel, riskColor, advice, specificAdvice = [];

    if (percentage < 30) { riskLevel = 'Low Risk'; riskColor = 'text-green-600'; advice = "You're on the right track! Continue a healthy lifestyle."; } 
    else if (percentage < 60) { riskLevel = 'Moderate Risk'; riskColor = 'text-yellow-600'; advice = "There are areas for improvement. Consider increasing physical activity and monitoring your diet."; } 
    else { riskLevel = 'High Risk'; riskColor = 'text-red-600'; advice = "Strongly recommended to consult a doctor for a comprehensive evaluation."; }
    if (data.bmi > 25) specificAdvice.push("Your BMI is high. Focus on a balanced diet.");
    if (data.smoking) specificAdvice.push("Smoking is a major risk factor. Quitting can improve your health.");
    if (data.bp > 130) specificAdvice.push("Your blood pressure is elevated. Reduce salt intake.");
    if (data.activity < 2) specificAdvice.push("Increase physical activity to 150+ minutes of moderate exercise per week.");
    if (data.alcohol === 'regular') specificAdvice.push("Regular alcohol use can impact heart health. Consider reducing intake.");
    if (data.diet === 'junk') specificAdvice.push("A diet high in processed food is a risk factor. Prioritize whole foods.");

    const generatePatientPDF = () => {
       const doc = new jsPDF();
       let yPos = 20;

       doc.setFont('helvetica', 'bold');
       doc.setFontSize(22);
       doc.text("Cardio-AI Predict Health Summary", 105, yPos, { align: 'center' });
       yPos += 15;
       
       doc.setFontSize(12);
       doc.setFont('helvetica', 'normal');
       doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
       yPos += 5;
       
       doc.setLineWidth(0.5);
       doc.line(20, yPos, 190, yPos);
       yPos += 10;

       doc.setFontSize(16);
       doc.setFont('helvetica', 'bold');
       doc.text("Your Assessment Result", 20, yPos);
       yPos += 10;
       
       doc.setFontSize(12);
       doc.setFont('helvetica', 'normal');
       doc.text(`Estimated Risk Percentage:`, 20, yPos);
       doc.setFont('helvetica', 'bold');
       doc.text(`${percentage}% (${riskLevel})`, 80, yPos);
       yPos += 15;
       
       doc.setFontSize(16); doc.setFont('helvetica', 'bold');
       doc.text("Your Health Metrics", 20, yPos);
       yPos += 8;
       doc.setFontSize(11); doc.setFont('helvetica', 'normal');
       doc.text(`- Age: ${data.age}`, 25, yPos); yPos += 6;
       doc.text(`- Body Mass Index (BMI): ${data.bmi}`, 25, yPos); yPos += 6;
       doc.text(`- Systolic Blood Pressure: ${data.bp} mmHg`, 25, yPos); yPos += 6;
       doc.text(`- Resting Heart Rate: ${data.hr} bpm`, 25, yPos); yPos += 10;

       doc.setFontSize(16);
       doc.setFont('helvetica', 'bold');
       doc.text("Personalized Recommendations", 20, yPos);
       yPos += 8;
       
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(12);
       const splitAdvice = doc.splitTextToSize(advice, 170);
       doc.text(splitAdvice, 20, yPos);
       yPos += (splitAdvice.length * 5) + 5;
       
       if (specificAdvice.length > 0) {
           specificAdvice.forEach(item => {
               const splitItem = doc.splitTextToSize(item, 160);
               doc.text(`•`, 25, yPos);
               doc.text(splitItem, 30, yPos);
               yPos += (splitItem.length * 5) + 2;
           });
       }
       
       doc.save("Cardio-AI-Health-Summary.pdf");
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold">Health Assessment Summary</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>
                 <div className="text-center">
                    <p className="text-gray-600 text-lg">Estimated Risk of Heart Disease:</p>
                    <p className={`text-7xl font-bold my-4 ${riskColor}`}>{percentage}%</p>
                    <p className={`text-2xl font-semibold py-2 px-4 rounded-full inline-block ${riskColor.replace('text', 'bg').replace('600', '100')}`}>{riskLevel}</p>
                </div>
                <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Personalized Recommendations:</h4>
                    <p className="text-gray-700 mb-3">{advice}</p>
                    <ul className="space-y-2">{specificAdvice.map((item, index) => <li key={index} className="flex items-start"><span className="text-blue-500 mr-2 mt-1">&#10003;</span><span>{item}</span></li>)}</ul>
                </div>
                <div className="mt-6 flex space-x-4"><button onClick={generatePatientPDF} className="btn-secondary w-1/2">Download PDF</button><button onClick={onClose} className="btn-primary w-1/2">Close</button></div>
            </div>
        </div>
    );
};

const DoctorPredictionResultModal = ({ result, onClose }) => {
    if (!result) return null;
    const { percentage, disease, factors } = result;
    const riskColor = percentage > 60 ? 'border-red-500' : percentage > 30 ? 'border-yellow-500' : 'border-green-500';
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold">Advanced Prediction Analysis</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>
                <div className={`grid md:grid-cols-2 gap-8 border-t-4 pt-6 ${riskColor}`}>
                    <div className="text-center bg-gray-50 rounded-lg p-6"><p className="text-gray-600 text-lg">Predicted Probability:</p><p className={`text-7xl font-bold my-2 ${riskColor.replace('border', 'text')}`}>{percentage}%</p><p className="text-xl font-semibold text-gray-800">{disease}</p></div>
                    <div className="bg-gray-50 rounded-lg p-6"><h4 className="font-semibold text-lg mb-3">Key Contributing Factors:</h4><div>{factors.map(f => <span key={f.name} className={`inline-block rounded-full px-3 py-1 text-sm font-semibold mr-2 mb-2 ${f.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{f.name}</span>)}</div></div>
                </div>
                <div className="mt-6"><button className="btn-primary w-full" onClick={onClose}>Return to Dashboard</button></div>
            </div>
        </div>
    );
};


export default function App() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState([]);
    
    const [appMode, setAppMode] = useState('patient');
    const [doctorView, setDoctorView] = useState('dashboard');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [predictionResult, setPredictionResult] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setUser(currentUser); setUserRole(userData.role);
                    setAppMode(userData.role === 'doctor' ? 'doctor' : 'patient');
                } else { await signOut(auth); }
            } else { setUser(null); setUserRole(null); }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (userRole !== 'doctor') { setPatients([]); return; }
        const unsubscribe = onSnapshot(query(collection(db, 'patients')), (snapshot) => {
            setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [userRole]);

    const handleLogout = () => { setPredictionResult(null); signOut(auth); };
    const handleSetAppMode = (mode) => { setPredictionResult(null); setAppMode(mode); };
    const handleSetDoctorView = (view, patient = null) => {
        setPredictionResult(null); setSelectedPatient(patient); setDoctorView(view);
    };

    if (loading) return <Spinner isPageLoader />;
    if (!user) return <AuthComponent />;

    return (
        <>
            <div className="min-h-screen container mx-auto px-4 py-8">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-blue-600">Cardio-AI Predict</h1>
                    <p className="text-lg text-gray-600 mt-2">AI-Powered Heart Disease Risk Assessment</p>
                    <div className="mt-2 text-sm text-gray-500 font-semibold">Logged in as: {user.email} ({userRole})</div>
                    <button onClick={handleLogout} className="mt-4 text-sm text-blue-600 hover:underline">Logout</button>
                </header>

                {userRole === 'doctor' && (
                     <div className="flex justify-center mb-8 bg-gray-200 rounded-full p-1 max-w-sm mx-auto">
                        <button onClick={() => handleSetAppMode('patient')} className={`w-1/2 py-2 px-4 rounded-full text-sm font-semibold transition-all duration-300 ${appMode === 'patient' ? 'mode-button-active' : 'mode-button-inactive'}`}>Patient Mode</button>
                        <button onClick={() => handleSetAppMode('doctor')} className={`w-1/2 py-2 px-4 rounded-full text-sm font-semibold transition-all duration-300 ${appMode === 'doctor' ? 'mode-button-active' : 'mode-button-inactive'}`}>Doctor Mode</button>
                    </div>
                )}
                
                <main>
                    {appMode === 'patient' && <PatientFormComponent setPredictionResult={setPredictionResult} />}
                    
                    {appMode === 'doctor' && (
                        <div>
                            {doctorView === 'dashboard' && (
                                <div className="max-w-5xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
                                     <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-semibold">Patient Database</h2>
                                        <button onClick={() => handleSetDoctorView('form', null)} className="btn-primary" style={{width: 'auto'}}>+ Add New Patient</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        {patients.length === 0 ? <p className="text-center text-gray-500 py-8">No patients found.</p> : (
                                            <table className="w-full text-left">
                                                <thead><tr className="bg-gray-100 text-sm font-semibold text-gray-600"><th className="p-3">Name</th><th className="p-3">Age</th><th className="p-3">Gender</th><th className="p-3">Last Risk %</th><th className="p-3">Actions</th></tr></thead>
                                                <tbody>{patients.map(p => (<tr key={p.id} className="border-b hover:bg-gray-50"><td className="p-3">{p.name}</td><td className="p-3">{p.data?.age}</td><td className="p-3">{p.data?.gender === 1 ? 'Male' : 'Female'}</td><td className={`p-3 font-semibold ${p.lastPrediction?.percentage > 60 ? 'text-red-600' : 'text-green-600'}`}>{p.lastPrediction?.percentage}%</td><td className="p-3"><button className="text-blue-600 hover:underline" onClick={() => handleSetDoctorView('details', p)}>View Details</button></td></tr>))}</tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}
                            {doctorView === 'form' && <DoctorFormComponent patient={selectedPatient} backToDashboard={() => handleSetDoctorView('dashboard')} setPredictionResult={setPredictionResult} />}
                            {doctorView === 'details' && <PatientDetailsComponent patient={selectedPatient} backToDashboard={() => handleSetDoctorView('dashboard')} editPatient={(p) => handleSetDoctorView('form', p)} />}
                        </div>
                    )}
                </main>

                <footer className="text-center mt-12">
                    <div className="disclaimer max-w-4xl mx-auto"><h4 className="font-bold">Disclaimer</h4><p>This tool is for informational purposes only and not medical advice.</p></div>
                    <p className="text-gray-500 text-sm mt-4">&copy; 2025 Cardio-AI Predict. All Rights Reserved.</p>
                </footer>
            </div>
            
            {predictionResult?.type === 'patient' && <PatientPredictionResultModal result={predictionResult} onClose={() => setPredictionResult(null)} />}
            {predictionResult?.type === 'doctor' && <DoctorPredictionResultModal result={predictionResult} onClose={() => { setPredictionResult(null); handleSetDoctorView('dashboard'); }} />}
        </>
    );
}

