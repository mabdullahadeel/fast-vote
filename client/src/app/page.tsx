"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type Question = {
  pub_date: string;
  question_text: string;
  id: string;
  user_id: string;
  options: Array<{
    option_text: string;
    votes: number;
    id: string;
  }>;
};

async function fetchUserQuestions() {
  const response = await fetch("http://localhost:8000/get-user-questions/", {
    credentials: "include",
    next: {
      revalidate: 0,
    },
  });
  const data = await response.json();
  return data as Question[];
}

async function deleteQuestion(id: string) {
  await fetch(`http://localhost:8000/question/${id}`, {
    credentials: "include",
    next: {
      revalidate: 0,
    },
    method: "DELETE",
  });
  return true;
}

export default function Home() {
  const [data, setData] = useState<Question[]>([]);

  function fetchQuestions() {
    fetchUserQuestions()
      .then((data) => setData(data))
      .catch((err) => console.log(err));
  }

  useEffect(() => {
    fetchQuestions();
  }, []);

  function deleteQuestionHandler(id: string) {
    deleteQuestion(id)
      .then((data) => {
        if (data) {
          fetchQuestions();
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
            Create Question
          </button>
        </Link>
      </div>
      <div className="flex flex-col items-center w-full">
        <h2 className="text-2xl font-bold">Your Questions</h2>
        <div className="flex flex-col items-center w-[90%]">
          {data.map((question) => (
            <div
              className="flex items-center my-2 justify-between w-full "
              key={question.id}
            >
              <h3 className="text-xl font-bold">{question.question_text}</h3>
              <div className="flex gap-3">
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  onClick={() => deleteQuestionHandler(question.id)}
                >
                  Delete
                </button>
                <Link href={`/q/${question.id}`}>
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
