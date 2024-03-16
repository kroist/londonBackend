import { BaseContract, JsonRpcProvider } from "ethers";
import usdcAbi from "./abi/usdcAbi";
import socialNetworkAbi from "./abi/socialNetworkAbi";
import { socialNetworkAddress } from "./config";
import { refetchState } from "./socialNetwork";

async function subEther(provider: JsonRpcProvider) {

    // while (true) {
        // try {
            console.log(await provider.getBlockNumber());
            const contract = new BaseContract(
                socialNetworkAddress,
                socialNetworkAbi,
                provider,
                null
            );
            const promiseArray = [];
            promiseArray.push(
                contract.addListener(
                    'NewComment',
                    (projectId, user, commentId) => {
                        console.log('new comment');
                        console.log(projectId, user, commentId);
                        refetchState(provider);
                    }
                )
            )
            promiseArray.push(
                contract.addListener(
                    'NewRatingChange',
                    (commentId, delta) => {
                        console.log('new rating change');
                        console.log(commentId, delta);
                        refetchState(provider);
                    }
                )
            )
            return await Promise.all(promiseArray);
        // } catch (error) {
        //     console.error(error);
        // }
    // }
}

export default subEther;