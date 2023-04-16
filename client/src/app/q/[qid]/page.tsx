"use client";

import { Questions } from "@/app/page";
import { useEffect, useState } from "react";

function fetchQuestion(qid: string) {
  return fetch(`http://localhost:8000/get-question/${qid}`, {
    credentials: "include",
  });
}

export default function Page({ params }: { params: { qid: string } }) {
  const [question, setQuestion] = useState<Questions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  useEffect(() => {}, []);

  return <div>This should render fine {params.qid}</div>;
}
