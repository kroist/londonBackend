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
    launchDate: string,
    shortDescription: string,
    apr: number,
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
            launchDate: "",
            shortDescription: "",
            apr: 0.0
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

    const projects = await getProjectsContract(provider);    console.log(projects);
    const projectsFirebase = await getProjectsFromFirebase(firebaseDb);


    const popularity: number[] = [];

    const updatedProjects: Project[] = [];

    for (let i = 0; i < projects.length; i++) {
        const project = projects[i]
        console.log('-----PROJECT-----');
        console.log(getUpdatedProject(
            project,
            projectsFirebase
        ));
        updatedProjects.push(getUpdatedProject(
            project,
            projectsFirebase
        ));
        // await saveProjectInFirebase(firebaseDb, project);

        const comments = await getCommentsContract(provider, project.id);
        popularity.push(calculatePopularity(updatedProjects[i], comments));
        console.log('---------');
        console.log(project.id);
        console.log(comments);
        const commentsFirebase = await getCommentsFromFirebase(firebaseDb, project.id);
        console.log('---------SAVED-------');
        console.log(commentsFirebase);
        const commentsToSave: Comment[] = [];
        comments.forEach(async (comment) => {
            commentsToSave.push(
                getUpdatedComment(
                    comment,
                    commentsFirebase
                )
            )
        });
        console.log('---TO_SAVE---');
        console.log(commentsToSave);
        // await saveCommentsInFirebase(firebaseDb, commentsToSave);
    }
    console.log("KEK");
    let mxPopularity = 0;
    for (let i = 0; i < projects.length; i++) {
        if (popularity[i] > mxPopularity) {
            mxPopularity = popularity[i];
        }
    }
    console.log('-----METRICS-----');
    for (let i = 0; i < projects.length; i++) {
        console.log(updatedProjects[i])
        console.log(mxPopularity, popularity[i]);
        await updateProjectMetric(
            firebaseDb,
            updatedProjects[i],
            popularity[i]/mxPopularity
        );
    }
}

function getUpdatedProject(
    projectContract: Project,
    savedProjects: Project[]
): Project {
    const found = savedProjects.find((element) => element.id == projectContract.id);
    if (found !== undefined) {
        return {
            id: projectContract.id,
            name: projectContract.name,
            url: projectContract.url,
            network: projectContract.network,
            whitepaper: found.whitepaper,
            tvl: found.tvl,
            rating: found.rating,
            launchDate: found.launchDate,
            shortDescription: found.shortDescription,
            apr: found.apr
        }
    }
    else {
        return projectContract;
    }
}

function getUpdatedComment(
    commentContract: Comment,
    savedComments: Comment[]
): Comment {
    const found = savedComments.find((element) => element.id == commentContract.id);
    if (found !== undefined) {
        return {
            id: commentContract.id,
            projectId: commentContract.projectId,
            user: found.user,
            textHash: commentContract.textHash,
            text: found.text,
            rating: commentContract.rating
        };
    }
    else {
        return commentContract;
    }
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
            tvl: String(toAdd.tvl),
            rating: Number(toAdd.rating),
        }
    )
}
async function updateProjectMetric(
    firebaseDb: Firestore,
    toAdd: Project,
    popularity: number
) {
    await setDoc(
        doc(firebaseDb, "projects", (toAdd.id.toString())),
        {
            id: Number(toAdd.id),
            name: String(toAdd.name),
            url: String(toAdd.url),
            network: String(toAdd.network),
            whitepaper: String(toAdd.whitepaper),
            tvl: String(toAdd.tvl),
            rating: Number(toAdd.rating),
            launchDate: String(toAdd.launchDate),
            shortDescription: String(toAdd.shortDescription),
            apr: Number(toAdd.apr),
            popularity: Number(popularity),
        }
    )
}


function calculatePopularity(
    project: Project,
    comments: Comment[]
) {
    const alpha = Number(1);
    const beta = Number(0.5);
    console.log(project.rating, comments.length);
    return alpha * Number(project.rating) + beta * Number(comments.length);
}

// async function calculateCommitment(

// )

async function getProjectsFromFirebase(
    firebaseDb: Firestore
) {
    const res: Project[] = [];
    const docs = await getDocs(
        collection(firebaseDb, "projects")
    );
    docs.forEach((doc) => {
        res.push({
            id: doc.data().id,
            name: doc.data().name,
            url: doc.data().url,
            network: doc.data().network,
            whitepaper: doc.data().whitepaper,
            tvl: doc.data().tvl,
            rating: doc.data().rating,
            launchDate: doc.data().launchDate,
            shortDescription: doc.data().shortDescription,
            apr: doc.data().apr
        })
    })

    return res;
}

export const getCommentsFromFirebase = async function getCommentsFromFirebase(
    firebaseDb: Firestore,
    projectId: number
) {
    const commentsRef = collection(firebaseDb, "comments");
    // const q = query(commentsRef, where("projectId", "==", projectId.toString()));
    const docs = await getDocs(commentsRef);
    const res: Comment[] = [];
    docs.forEach((doc) => {
        if (doc.data().projectId == projectId) {
            res.push({
                id: doc.data().id,
                projectId: doc.data().projectId,
                user: doc.data().user,
                textHash: doc.data().textHash,
                text: doc.data().text,
                rating: doc.data().rating,
            });
        }
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


