"use client";

import { Poll } from "@/app/page";
import { useCallback, useEffect, useRef, useState } from "react";

type PollRes = Poll & {
  has_voted: boolean;
  vote: string;
};

async function fetchPoll(qid: string) {
  const req = await fetch(`http://localhost:8000/get-poll/${qid}`, {
    credentials: "include",
  });
  const res = await req.json();
  return res as PollRes;
}

async function submitVote(optId: string) {
  await fetch(`http://localhost:8000/vote/?option_id=${optId}`, {
    credentials: "include",
    method: "POST",
  });
  return true;
}

type WSMessage = {
  type: "voted";
  payload: Poll["options"];
};

export default function Page({ params }: { params: { qid: string } }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [poll, setPoll] = useState<PollRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const totalVotes = poll?.options.reduce(
    (acc, option) => acc + option.votes,
    0
  );

  useEffect(() => {
    fetchPoll(params.qid)
      .then((res) => {
        setPoll(res);
        setSelectedOption(res.vote);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params]);

  const handleMessage = useCallback((e: MessageEvent) => {
    const res = JSON.parse(e.data) as WSMessage;
    if (res.type === "voted") {
      setPoll((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          options: res.payload,
        };
      });
    }
  }, []);

  const handleSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current?.close();
    }
    const ws = new WebSocket(`ws://localhost:8000/ws/poll/${params.qid}`);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.addEventListener("message", handleMessage);
    };
    ws.onclose = () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [params.qid, handleMessage]);

  useEffect(() => {
    handleSocket();
    const wsC = wsRef.current;
    return () => {
      console.log("closing ws");
      wsC?.close();
    };
  }, [handleSocket]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    submitVote(selectedOption)
      .then((res) => {
        if (res) {
          console.log("success");
          setHasVoted(true);
        }
      })
      .catch((err) => {
        setMessage("Error submitting vote");
      });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  return (
    <div className=" text-white p-4 h-[100vh] flex items-center justify-center">
      <div className="min-w-full flex items-center justify-center flex-col">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {poll?.poll_text}
        </h2>
        <ul className="flex align-center justify-center flex-col gap-1 w-full max-w-lg">
          {poll?.options.map((option) => (
            <li
              key={option.id}
              className="flex justify-between items-center mb-2 gap-3 w-full"
            >
              <button
                className={`w-full rounded-full px-4 py-2 ${
                  selectedOption === option.id
                    ? "bg-indigo-600"
                    : "bg-gray-700 hover:bg-gray-600"
                } disabled:cursor-not-allowed`}
                onClick={() => setSelectedOption(option.id)}
                disabled={poll?.has_voted || hasVoted}
              >
                {option.option_text}
              </button>
              {!!totalVotes && totalVotes > 0 && (
                <span className="text-sm font-medium text-gray-400">
                  {`${((option.votes / totalVotes) * 100).toFixed(2)}%`}
                </span>
              )}
            </li>
          ))}
        </ul>
        {message && (
          <div className="text-red-500 text-sm font-medium mt-2">{message}</div>
        )}
        <button
          className="mt-4 bg-indigo-600 text-white font-medium py-2 px-4 rounded-md shadow-md hover:bg-indigo-700 max-w-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedOption || poll?.has_voted || hasVoted}
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
