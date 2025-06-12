import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { TestProblem } from '@/types/testTypes';
import { ProblemType, DifficultyLevel } from '@/types'; // Corrected import path
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Authenticated user:', user);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { problemData, testSeriesId } = await request.json();

  if (!problemData || !testSeriesId) {
    return NextResponse.json({ error: 'Missing problemData or testSeriesId' }, { status: 400 });
  }

  // Validate required fields from problemData
  if (!problemData.problemStatement || !problemData.answerFormat) {
    return NextResponse.json({ error: 'Missing required problem data fields (problemStatement, answerFormat)' }, { status: 400 });
  }

  // Validate testSeriesId belongs to the user
  const { data: testSeries, error: testSeriesError } = await supabase
    .from('test_series')
    .select('id, creator_id')
    .eq('id', testSeriesId)
    .eq('creator_id', user.id)
    .single();

  if (testSeriesError || !testSeries) {
    console.error('Error fetching test series or unauthorized:', testSeriesError);
    return NextResponse.json({ error: 'Test series not found or unauthorized' }, { status: 404 });
  }

  // Construct the full TestProblem object, filling in missing required fields
  const newTestProblem: TestProblem = {
    id: uuidv4(),
    test_series_id: testSeriesId,
    problem_statement: problemData.problemStatement,
    problem_type: problemData.problemType || 'theory', // Default to 'theory'
    difficulty: problemData.difficulty || 'medium', // Default to 'medium'
    answer_format: problemData.answerFormat,
    correct_answer: problemData.correctAnswer || null,
    multiple_choice_options: (problemData.multipleChoiceOptions && problemData.multipleChoiceOptions.length > 0) ? problemData.multipleChoiceOptions : null,
    explanation: problemData.explanation || null, // AI might not provide this directly
    topic: problemData.topic || 'General', // Default or infer from problemData
    order_index: 0, // This should ideally be determined based on existing problems in the series
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('New Test Problem to insert:', newTestProblem);
  // Insert the new problem into the 'test_problems' table
  const { data, error } = await supabase
    .from('test_series_problems')
    .insert([newTestProblem])
    .select();
  console.log('Supabase insert data:', data);
  console.log('Supabase insert error:', error);

  if (error) {
    console.error('Error inserting test problem:', error.message, error.details, error.hint, error.code);
    return NextResponse.json({ error: 'Failed to add problem to test series', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Problem added successfully', problem: data[0] });
}
