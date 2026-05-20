export type ExamAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "CANCELLED";

export interface ExamChoice {
  choice_id: string;
  choice_text: string;
  display_order: number | null;
}

export interface ExamAttemptQuestion {
  question_id: string;
  question_text: string;
  question_type: "MCQ_SINGLE" | "MCQ_MULTI";
  choices: ExamChoice[];
}

export interface CurrentAttemptItem {
  attempt_items_id: string;
  question_id: string;
  sequence_index: number;
  shown_at: string;
  answered_at: string | null;
  time_per_item: number | null;
  theta_at_selection: number | null;
  selected_choice_id: string | null;
  selected_choice_ids: string[];
  answer_text: string | null;
  question: ExamAttemptQuestion;
}

export interface ExamAttemptState {
  attempt_id: string;
  status: ExamAttemptStatus;
  started_at: string;
  submitted_at: string | null;
  total_score: string | number | null;
  passed: boolean | null;
  total_level: number;
  theta_estimate: number;
  standard_error: number | null;
  test_information: number | null;
  adaptive_stop_reason: string | null;
  adaptive_completed_at: string | null;
  time_per_exam: number | null;
  can_view_result: boolean;
  result_hidden: string | null;
  exam: {
    course_exams_id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    show_results_immediately: boolean;
    question_count: number;
  };
  progress: {
    answered_count: number;
    shown_count: number;
    total_questions: number;
    min_questions: number;
    max_questions: number;
    remaining_seconds: number;
    adaptive_complete: boolean;
    can_submit: boolean;
  };
  current_item: CurrentAttemptItem | null;
  answered_items: {
    attempt_items_id: string;
    question_id: string;
    sequence_index: number;
    answered_at: string;
    theta_at_selection: number | null;
    selected_choice_id: string | null;
    selected_choice_ids: string[];
  }[];
}

export interface ExamAttemptSummary {
  exam: {
    course_exams_id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    show_results_immediately: boolean;
    question_count: number;
  };
  summary: {
    total_enrolled: number;
    attempts_started: number;
    submitted: number;
    in_progress: number;
    average_score: number | null;
    behavior_events: number;
  };
  attempts: {
    attempt_id: string;
    student_code: string;
    student_name: string;
    email: string;
    status: ExamAttemptStatus;
    started_at: string;
    submitted_at: string | null;
    total_score: string | number | null;
    passed: boolean | null;
    theta_estimate: number | null;
    standard_error: number | null;
    test_information: number | null;
    adaptive_stop_reason: string | null;
    time_per_exam: number | null;
    answered_count: number;
    behavior_event_count: number;
    last_behavior_event: {
      event_type: string;
      occurred_at: string;
    } | null;
  }[];
}
