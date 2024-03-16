import { Contract, JsonRpcProvider } from "ethers";
import { firebaseConfig, socialNetworkAddress } from "./config";
import socialNetworkAbi from "./abi/socialNetworkAbi";
import { Firestore, addDoc, collection, doc, getDocs, getFirestore, query, setDoc, where } from "firebase/firestore";
import { initializeApp } from "firebase/app";

export type Project = {
    id: number,
    name: string,
    url: string,
    network: string,
    whitepaper: string,
    tvl: number,
    rating: number,
};

export type Comment = {
    id: number,
    projectId: number,
    user: string,
    textHash: string,
    text: string,
    rating: number,
}

export const getProjectsContract = async function getProjectsContract(provider: JsonRpcProvider) {
    const contract = new Contract(
        socialNetworkAddress,
        socialNetworkAbi,
        provider
    );
    const projects = await contract.getProjects();
    const retProjects: Project[] = [];
    for (let i = 0; i < projects.length; i++) {
        retProjects.push({
            id: projects[i].id,
            name: projects[i].name,
            network: projects[i].network,
            url: projects[i].url,
            whitepaper: "",
            tvl: 0,
            rating: projects[i].rating,
        })
    }
    return retProjects;
}

export const getCommentsContract = async function getProjectsContract(
    provider: JsonRpcProvider,
    projectId: number,
) {
    const contract = new Contract(
        socialNetworkAddress,
        socialNetworkAbi,
        provider
    );
    const comments = await contract.getComments(projectId);
    const retComments: Comment[] = [];
    for (let i = 0; i < comments.length; i++) {
        retComments.push({
            id: comments[i].id,
            projectId: comments[i].projectId,
            user: comments[i].user,
            rating: comments[i].rating,
            textHash: comments[i].textHash,
            text: "",
        })
    }
    return retComments;
}

export const refetchState = async function refetchState(
    provider: JsonRpcProvider
) {

    const firebaseApp = initializeApp(firebaseConfig);

    const firebaseDb = getFirestore(firebaseApp);

    const projects = await getProjectsContract(provider);
    console.log(projects);

    projects.forEach(async (project) => {

        await saveProjectInFirebase(firebaseDb, project);

        const comments = await getCommentsContract(provider, project.id);
        console.log('---------');
        console.log(project.id);
        console.log(comments);
        const savedComments = await getCommentsFromFirebase(firebaseDb, project.id);
        console.log('---------SAVED-------');
        console.log(savedComments);
        const commentsToSave: Comment[] = [];
        comments.forEach(async (comment) => {
            const found = savedComments.find((element) => element.id === comment.id);
            if (found !== undefined) {
                commentsToSave.push({
                    id: comment.id,
                    projectId: comment.projectId,
                    user: comment.user,
                    textHash: comment.textHash,
                    text: found.text,
                    rating: comment.rating
                });
            }
            else {
                commentsToSave.push(comment);
            }
        });
        console.log('---TO_SAVE---');
        console.log(commentsToSave);
        await saveCommentsInFirebase(firebaseDb, commentsToSave);
    });
}

export const saveProjectInFirebase = async function saveInFirebase(
    firebaseDb: Firestore,
    toAdd: Project
) {
    await setDoc(
        doc(firebaseDb, "projects", (toAdd.id.toString())),
        {
            id: Number(toAdd.id),
            name: String(toAdd.name),
            url: String(toAdd.url),
            network: String(toAdd.network),
            whitepaper: String(toAdd.whitepaper),
            tvl: String(toAdd.whitepaper),
            rating: Number(toAdd.rating),
        }
    )
}

export const getCommentsFromFirebase = async function getCommentsFromFirebase(
    firebaseDb: Firestore,
    projectId: number
) {
    const commentsRef = collection(firebaseDb, "comments");
    const q = query(commentsRef, where("projectId", "==", projectId.toString()));
    const docs = await getDocs(q);
    const res: Comment[] = [];
    docs.forEach((doc) => {
        res.push({
            id: doc.data().id,
            projectId: doc.data().projectId,
            user: doc.data().user,
            textHash: doc.data().textHash,
            text: doc.data().text,
            rating: doc.data().rating,
        });
    })
    return res;
}

export const saveCommentsInFirebase = async function saveCommentsInFirebase(
    firebaseDb: Firestore,
    toAdd: Comment[]
) {
    for (let i = 0; i < toAdd.length; i++) {
        const comment = toAdd[i];
        console.log("----ADDING----");
        console.log(comment);
        const res = await setDoc(
            doc(firebaseDb, "comments", (comment.id.toString())),
            {
                id: Number(comment.id),
                projectId: Number(comment.projectId),
                user: String(comment.user),
                rating: Number(comment.rating),
                textHash: String(comment.textHash),
                text: String(comment.text),
            }
        );
        console.log(res);
    }
}


