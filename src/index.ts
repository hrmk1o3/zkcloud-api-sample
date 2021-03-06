import axios, { AxiosRequestConfig } from "axios";
import fs from "fs";
import FormData from "form-data";
import * as dotEnv from "dotenv";
import * as stream from "stream";
import { promisify } from "util";

dotEnv.config();

type ProofInfo = {
  id: string;
  duration: number;
  protocol: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  proofFileUrl: string | null;
};

const API_KEY = process.env.API_KEY;
const API_BASE_URL = "https://api.zkcloud.systems";

const main = async () => {
  if (!API_KEY) {
    throw new Error("set your API key");
  }

  const circuitName = "compute";
  const circom = fs.createReadStream(
    `${process.cwd()}/scripts/data/${circuitName}.circom`,
    "utf-8",
  );
  const input = fs.createReadStream(
    `${process.cwd()}/scripts/data/${circuitName}_input.json`,
    "utf-8",
  );

  const form = new FormData();
  form.append("circom", circom);
  form.append("input", input);
  form.append("protocol", "PLONK");

  // const headers = form.getHeaders();
  // const res = await axios.post<FormData, { data: ProofInfo }>(
  //   `${API_BASE_URL}/proofs/create/circom`,
  //   form,
  //   {
  //     headers: {
  //       ...headers,
  //       Authorization: `Bearer ${API_KEY}`,
  //     },
  //   },
  // );

  // const proofId = res.data.id;
  const proofId = "M8-zrTH0WqXVFoeYuDb9P";
  console.log("proofId", proofId);

  let waitProofCreation = true;
  while (waitProofCreation) {
    const proofInfo = await axios.get<AxiosRequestConfig, { data: ProofInfo }>(
      `${API_BASE_URL}/proofs/${proofId}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      },
    );

    if (proofInfo.data.status === "COMPLETED" && proofInfo.data.proofFileUrl != null) {
      const writer = fs.createWriteStream(`${process.cwd()}/scripts/data/${circuitName}_proof.zip`);
      const file = await axios.get<AxiosRequestConfig, { data: stream.Stream }>(
        proofInfo.data.proofFileUrl,
        { responseType: "stream" },
      );
      file.data.pipe(writer);
      await promisify(stream.finished)(writer);
      waitProofCreation = false;
    } else {
      await sleep(10);
    }
  }
};

const sleep = async (seconds: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined);
    }, seconds);
  });
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
