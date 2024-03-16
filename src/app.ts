import { JsonRpcApiProvider, JsonRpcProvider } from "ethers";
import subEther from "./ether_sub";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import { firebaseConfig } from "./config";
import { getProjectsContract, Project, refetchState } from "./socialNetwork";

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

const firebaseDb = getFirestore(firebaseApp);
const port = 3000

const provider = new JsonRpcProvider('https://rpc.ankr.com/polygon_mumbai')


refetchState(provider);

getProjectsContract(provider);

subEther(provider);
