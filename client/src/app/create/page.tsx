"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_OPTIONS = 5;
const MIN_OPTIONS = 2;

async function createPoll(payload: { poll: string; options: string[] }) {
  const response = await fetch("http://localhost:8000/create-poll/", {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return data;
}

export default function Page() {
  const [poll, setPoll] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const router = useRouter();

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > MIN_OPTIONS) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (!isValid()) {
      return;
    }
    const payload = {
      poll,
      options,
    };
    const qid = await createPoll(payload);
    if (qid) {
      router.push(`/q/${qid}`);
    }
  };

  const isValid = () => {
    if (poll.length === 0) {
      return false;
    }
    for (const option of options) {
      if (option.length === 0) {
        return false;
      }
    }
    return true;
  };

  return (
    <form className="bg-black p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl mb-4 text-gray-300">Create a new poll</h2>
      <div className="mb-4">
        <label
          htmlFor="poll"
          className="block text-gray-300 font-semibold mb-2"
        >
          Poll
        </label>
        <input
          type="text"
          id="poll"
          className="w-full py-2 px-4 bg-gray-900 text-gray-200 rounded-lg border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring"
          value={poll}
          onChange={(event) => setPoll(event.target.value)}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 font-semibold mb-2">
          Options
        </label>
        {options.map((option, index) => (
          <div className="flex items-center mb-2" key={index}>
            <input
              type="text"
              className="w-full py-2 px-4 bg-gray-900 text-gray-200 rounded-lg border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring mr-4"
              placeholder={`Option ${index + 1}`}
              value={option}
              required
              onChange={(event) =>
                handleOptionChange(index, event.target.value)
              }
            />
            {options.length > 2 && (
              <button
                type="button"
                className="text-red-600 font-semibold focus:outline-none"
                onClick={() => removeOption(index)}
              >
                X
              </button>
            )}
          </div>
        ))}
        {options.length < 5 && (
          <button
            type="button"
            className="text-indigo-500 font-semibold focus:border-indigo-500 focus:outline-none focus:ring ring-offset-indigo-400"
            onClick={addOption}
          >
            Add option
          </button>
        )}
      </div>
      <button
        type="submit"
        className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 hover:cursor-pointer active:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={!isValid()}
      >
        Create poll
      </button>
    </form>
  );
}
