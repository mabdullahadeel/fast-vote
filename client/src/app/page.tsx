"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type Poll = {
  pub_date: string;
  poll_text: string;
  id: string;
  user_id: string;
  options: Array<{
    option_text: string;
    votes: number;
    id: string;
  }>;
};

async function fetchUserPolls() {
  const response = await fetch("http://localhost:8000/get-user-polls/", {
    credentials: "include",
    next: {
      revalidate: 0,
    },
  });
  const data = await response.json();
  return data as Poll[];
}

async function deletePoll(id: string) {
  await fetch(`http://localhost:8000/poll/${id}`, {
    credentials: "include",
    next: {
      revalidate: 0,
    },
    method: "DELETE",
  });
  return true;
}

export default function Home() {
  const [data, setData] = useState<Poll[]>([]);

  function fetchPolls() {
    fetchUserPolls()
      .then((data) => setData(data))
      .catch((err) => console.log(err));
  }

  useEffect(() => {
    fetchPolls();
  }, []);

  function deletePollHandler(id: string) {
    deletePoll(id)
      .then((data) => {
        if (data) {
          fetchPolls();
        }
      })
      .catch((err) => console.log(err));
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold">Fast Vote</h1>
      <div className="w-full flex justify-end">
        <Link href="/create">
          <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Create Poll
          </button>
        </Link>
      </div>
      <div className="flex flex-col items-center w-full">
        <h2 className="text-2xl font-bold">Your Polls</h2>
        <div className="flex flex-col items-center w-[90%]">
          {data.map((poll) => (
            <div
              className="flex items-center my-2 justify-between w-full "
              key={poll.id}
            >
              <h3 className="text-xl font-bold">{poll.poll_text}</h3>
              <div className="flex gap-3">
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  onClick={() => deletePollHandler(poll.id)}
                >
                  Delete
                </button>
                <Link href={`/q/${poll.id}`}>
                  <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Open
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
